# Rollup

## Summary

Welcome to the Kibana rollup plugin! This plugin provides Kibana support for [Elasticsearch's rollup feature](https://www.elastic.co/guide/en/elasticsearch/reference/current/xpack-rollup.html). Please refer to the Elasticsearch documentation to understand rollup indices and how to create rollup jobs.

This plugin allows Kibana to:

* Create and manage rollup jobs
* Create rollup index patterns
* Create visualizations from rollup index patterns
* Identify rollup indices in Index Management

The rest of this doc dives into the implementation details of each of the above functionality.

## Quick steps for testing

**Note:** Since Rollups has been deprecated, the UI is hidden unless there is an existing rollup job in the cluster. To test the Rollup UI, you must first create a rollup job using the workaround described below:

1. **Start Elasticsearch and Kibana**

2. **Add sample data** (e.g., "Sample web logs")

3. **Create a mock rollup index** through Dev Tools Console to simulate rollup usage:
   ```
   PUT /mock_rollup_index
   {
     "mappings": {
       "_meta": {
         "_rollup": {
           "id": "logs_job"
         }
       }
     }
   }
   ```

4. **Create a rollup job** through Dev Tools Console:
   ```
   PUT _rollup/job/logs_job
   {
     "id": "logs_job",
     "index_pattern": "kibana_sample_data_logs",
     "rollup_index": "rollup_logstash",
     "cron": "* * * * * ?",
     "page_size": 1000,
     "groups": {
       "date_histogram": {
         "interval": "60m",
         "delay": "7d",
         "time_zone": "UTC",
         "field": "@timestamp"
       },
       "terms": {
         "fields": [
           "geo.src",
           "machine.os.keyword"
         ]
       },
       "histogram": {
         "interval": "1003",
         "fields": [
           "bytes",
           "memory"
         ]
       }
     }
   }
   ```

5. **Delete the mock rollup index** (it causes issues for the rollup API used to fetch rollup indices):
   ```
   DELETE /mock_rollup_index
   ```

6. **Navigate to Stack Management > Rollup Jobs** to view the list of rollup jobs.

### Steps for creating and running a rollup job in the UI

1. Create a rollup job with an index pattern that captures an existing data (e.g. `kibana_sample_data_logs`).
2. Set frequency to "minute". Clear the latency buffer field.
3. Select the time field which is the same time field selected in the installed index pattern (`timestamp` without an `@` in the case of web logs).
4. Specify a time bucket size (`10m` will do).
5. Select a few terms, histogram, and metrics fields.
6. Create and start the rollup job. Wait a minute for the job to run. You should see the numbers for documents and pages processed change in the detail panel.

---

## Create and manage rollup jobs

The most straight forward part of this plugin! A new app called Rollup Jobs is registered in the Management section and follows a typical CRUD UI pattern. This app allows users to create, start, stop, clone, and delete rollup jobs. There is no way to edit an existing rollup job; instead, the UI offers a cloning ability. The client-side portion of this app lives in [public/crud_app](public/crud_app) and uses endpoints registered in [server/routes/api/jobs](server/routes/api/jobs).

Refer to the [Elasticsearch documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/rollup-getting-started.html) to understand rollup indices and how to create rollup jobs.

## Create rollup index patterns

Kibana uses index patterns to consume and visualize rollup indices. Typically, Kibana can inspect the indices captured by an index pattern, identify its aggregations and fields, and determine how to consume the data. Rollup indices don't contain this type of information, so we predefine how to consume a rollup index pattern with the type and typeMeta fields on the index pattern saved object. All rollup index patterns have `type` defined as "rollup" and `typeMeta` defined as an object of the index pattern's capabilities.

In the Index Pattern app, the "Create index pattern" button includes a context menu when a rollup index is detected. This menu offers items for creating a standard index pattern and a rollup index pattern. A [rollup config is registered to index pattern creation extension point](public/index_pattern_creation/rollup_index_pattern_creation_config.js). The context menu behavior in particular uses the `getIndexPatternCreationOption()` method.  When the user chooses to create a rollup index pattern, this config changes the behavior of the index pattern creation wizard:

1. Adds a `Rollup` badge to rollup indices using `getIndexTags()`.
2. Enforces index pattern rules using `checkIndicesForErrors()`. Rollup index patterns must match **one** rollup index, and optionally, any number of regular indices. A rollup index pattern configured with one or more regular indices is known as a "hybrid" index pattern.  This allows the user to visualize historical (rollup) data and live (regular) data in the same visualization.
3. Routes to this plugin's [rollup `_fields_for_wildcard` endpoint](server/routes/api/index_patterns/register_fields_for_wildcard_route.ts), instead of the standard one, using `getFetchForWildcardOptions()`, so that the internal rollup data field names are mapped to the original field names.
4. Writes additional information about aggregations, fields, histogram interval, and date histogram interval and timezone to the rollup index pattern saved object using `getIndexPatternMappings()`. This collection of information is referred to as its "capabilities".

Once a rollup index pattern is created, it is tagged with `Rollup` in the list of index patterns, and its details page displays capabilities information. This is done by registering [yet another config for the index pattern list](public/index_pattern_list/rollup_index_pattern_list_config.js) extension points.

## Create visualizations from rollup index patterns

This plugin enables the user to create visualizations from rollup data using the Visualize app, excluding TSVB, Vega, and Timelion. When Visualize sends search requests, this plugin routes the requests to the [Elasticsearch rollup search endpoint](https://www.elastic.co/guide/en/elasticsearch/reference/current/rollup-search.html), which searches the special document structure within rollup indices. The visualization options available to users are based on the capabilities of the rollup index pattern they're visualizing.

Routing to the Elasticsearch rollup search endpoint is done by creating an extension point in Courier, effectively allowing multiple "search strategies" to be registered. A [rollup search strategy](public/search/register.js) is registered by this plugin that queries [this plugin's rollup search endpoint](server/routes/api/search.js).

Limiting visualization editor options is done by [registering configs](public/visualize/index.js) to various vis extension points. These configs use information stored on the rollup index pattern to limit:
* Available aggregation types
* Available fields for a particular aggregation
* Default and base interval for histogram aggregation
* Default and base interval, and time zone, for date histogram aggregation

## Identify rollup indices in Index Management

In Index Management, similar to system indices, rollup indices are hidden by default. A toggle is provided to show rollup indices and add a badge to the table rows. This is done by using Index Management's extension points.

The toggle and badge are registered on the client-side in [public/extend_index_management](public/extend_index_management).

Additional data needed to filter rollup indices in Index Management is provided with a [data enricher](rollup_data_enricher.ts).