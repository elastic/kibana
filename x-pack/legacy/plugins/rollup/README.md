## Summary
Welcome to the Kibana rollup plugin! This plugin provides Kibana support for [Elasticsearch's rollup feature](https://www.elastic.co/guide/en/elasticsearch/reference/master/xpack-rollup.html). Please read the ES documentation to understand what rollup indices are, and how rollup jobs create them.

This plugin allows Kibana to:

1. Create and manage rollup jobs
2. Create rollup index patterns
3. Create visualizations from rollup index patterns
4. Flag rollup indices in Index Management

The rest of this doc dives into the implementation details of each of the above functionality.

---

## Create and manage rollup jobs

The most straight forward part of this plugin! A new app called Rollup Jobs is registered in the Management section and follows a typical CRUD UI pattern. This app allows users to create and manage (start, stop, delete) rollup jobs. There is no way to edit an existing rollup job; instead, the UI offers a cloning ability. The client-side portion of this app lives [here](public/crud_app) and uses endpoints registered [here](server/routes/api/jobs.js).

Refer to [ES documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/rollup-getting-started.html) to understand what rollup indices are, and how rollup jobs create them.

## Create rollup index patterns

In order for Kibana to consume and use rollup indices for visualizations, similar to regular indices, a index pattern must be created. Because rollup data have limited aggregations and fields available, we store a rollup index pattern's "capabilities" on the index pattern saved object itself. Rollup index patterns have the fields `type` and `typeMeta`, which are not present on regular index patterns. `type` will be the string `rollup` and `typeMeta` will be an object containing the pattern's capabilities.

Once the user has at least one rollup job configured, in the Index Pattern UI, the standard `Create index pattern` button will become a context menu with two options, one for regular index pattern and one for rollup index pattern. This is done by registering a [rollup config to index pattern creation extension points](public/index_pattern_creation/rollup_index_pattern_creation_config.js), in particular using the `getIndexPatternCreationOption()`. Once the user selects to create a rollup index pattern, this config also adjusts creation wizard in the following ways:
1. Adds `Rollup` badge to list of matching indices that are rollup indices using `getIndexTags()`.
2. Enforces index pattern rules using `checkIndicesForErrors()`. Rollup index patterns must match **one** rollup index, and optionally any number of regular indices. A rollup index pattern configured with one or more regular indices is affectionally known as a "hybrid" index pattern, and this allows the user to visualize historical (rollup) data and live (regular) data in the same visualization.
3. Routes to this plugin's [rollup `_fields_for_wildcard` endpoint](server/routes/api/index_patterns.js) using `getFetchForWildcardOptions()`, so that the internal rollup data field names are mapped to the original field names.
4. Writes additional information about what aggregations, fields, histogram interval, and date histogram interval and timezone to the rollup index pattern saved object using `getIndexPatternMappings()`. This collection of information referred to as its "capabilities".

Once a rollup index pattern is created, it will be tagged with `Rollup` in the list of index patterns, and its details page will display capabilities information. This is done by registering [yet another config for index pattern list](public/index_pattern_list/rollup_index_pattern_list_config.js) extension points.

## Create visualizations from rollup index patterns

This plugin enables Kibana to create basic visualizations from rollup index patterns (note that this does not include TSVB, Vega, or Timelion). This is done by routing rollup index pattern queries to [Elasticsearch rollup search endpoint](https://www.elastic.co/guide/en/elasticsearch/reference/current/rollup-search.html). Querying this endpoint, as opposed to the standard index search, is needed because rollup indices use a different document structure than regular indices. In addition, visualization editor options are also limited to the aggregations and metrics that are available for the specified rollup index pattern.

Routing to ES rollup search endpoint is done by creating an extension point in courier, effectively allowing multiple "search strategies" to be registered. A [rollup search strategy](public/search/register.js) is registered by this plugin that queries [this plugin's rollup search endpoint](server/routes/api/search.js).

Limiting visualization editor options is done by [registering configs](public/visualize/index.js) to various vis extension points. These configs use information stored on the rollup index pattern to limit:
1. Available aggregation types
2. Available fields for a particular aggregation
3. Default and base interval for histogram aggregation
4. Default and base interval, and time zone, for date histogram aggregation

## Flag rollup indices in Index Management

In Index Management, similar to system indices, rollup indices are hidden by default and there is a toggle provided to show rollup indices as well as adding a badge to the table rows. This is done by using Index Management's extension points.

Toggle and badge are registered on client-side [here](public/extend_index_management/index.js).

Additional data needed to filter rollup indices in Index Management is provided with a [data enricher](rollup_data_enricher.js).