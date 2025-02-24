# Search Profiler

## About

The search profiler consumes the [Profile API](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-profile.html)
by sending a `search` API with `profile: true` enabled in the request body. The response contains
detailed information on how Elasticsearch executed the search request. People use this information
to understand why a search request might be slow.

## How to test

### Query profile

Execute the default query to generate results in the Query profile tab.

```json
{
  "query":{
    "match_all" : {}
  }
}
```

### Aggregation profile

Execute an aggregation query to generate results in the Aggregation profile tab.

```json
{
  "aggs": {
    "avg_grade": { "avg": { "field": "grade" } }
  }
}
```