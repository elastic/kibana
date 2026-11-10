# Index Explorer

An explorer for Elasticsearch data, built on ES|QL and modeled on [Datasette](https://datasette.io/). Open it at `/app/indexExplorer`.

- **Browse**: list indices, data streams and aliases with document counts, then open any of them (or an index pattern such as `logs-*`) as a paginated, sortable table.
- **Filter and facet**: add filters in the UI or in the URL, and click a filter to edit it. Fields with few distinct values offer a value picker. Run a free-text search, and facet on any field that ES|QL can group by; fields with few distinct values are suggested as facets.
- **Columns**: by default the table shows the time field (`@timestamp` when present) followed by the fields that qualify as suggested facets; metadata such as `_id` only appears when picked. Long values stay on one line and end with an ellipsis.
- **Histogram**: indices with an `@timestamp` field show document counts over time. Drag across the chart to filter to a time range.
- **Document view**: each `_id` links to a page with the document's fields and the raw `_source`.
- **ES|QL**: every view is an ES|QL query, shown on the page with an **Edit in ES|QL** button. The query page runs any ES|QL; `?name` placeholders become parameter inputs, and the query and parameters are kept in the URL.
- **Canned queries and metadata**: define queries, titles, descriptions, default facets and column order in `kibana.yml`.
- **Export**: download any table view or query result as CSV or JSON.

Every request runs with the current user's Elasticsearch privileges (`asCurrentUser`), so users can only see data they can already read.

## URLs

The index table view follows Datasette's query string conventions, so you can bookmark and share any view:

| Parameter | Meaning |
| --- | --- |
| `field=value` | `field` exactly equals `value` |
| `field__<op>=value` | operators: `exact`, `not`, `contains`, `startswith`, `gt`, `gte`, `lt`, `lte`, `in`, `notin` (comma-separated), `exists`, `missing` |
| `_search=text` | full-text search with ES\|QL `QSTR()` (query string syntax) |
| `_facet=field` | facet on `field` (repeatable) |
| `_col=field` | show only these columns, in this order (repeatable; ES\|QL `KEEP`; `_id` and `_index` allowed) |
| `_nocol=field` | hide this column from the default set (repeatable; ignored with `_col`) |
| `_sort=field` / `_sort_desc=field` | sort order (defaults to `@timestamp` descending when present) |
| `_page=n`, `_size=n` | pagination (`from + size` must stay within 10,000, the ES\|QL row limit) |

For example, this URL shows failed task runs from the Kibana event log, faceted by task type and newest first: `/app/indexExplorer/index/.kibana-event-log-ds?event.provider=taskManager&event.outcome=failure&_facet=kibana.task.type&_sort_desc=@timestamp`.

The event log is a hidden data stream, so turn on **Include hidden** on the home page to see it in the list.

The ES|QL page uses `/app/indexExplorer/query?esql=...&p.<name>=<value>&t.<name>=number`.

Filters follow ES|QL semantics. On multi-valued fields, `==` and the comparison operators match only single-valued documents, and facet counts count each value separately, so they can add up to more than the total.

## Configuration

```yaml
xpack.indexExplorer:
  enabled: true
  title: Kibana event log
  description: Task manager, alerting and actions activity recorded by Kibana.
  maxExportRows: 10000 # rows per index export (default and maximum 10000, the ES|QL row limit)
  indices:
    '.kibana-event-log-*': # exact names or `*` patterns
      title: Event log
      description: Kibana event log
      facets: [event.provider, event.action, event.outcome] # always shown on this index
      columns: ['@timestamp', event.provider, event.action, event.outcome, message] # replaces the default columns
  queries:
    - id: events-by-action
      title: Events by action
      description: Event counts per action and outcome for one provider
      query: |
        FROM .kibana-event-log-ds
        | WHERE event.provider == ?provider
        | STATS events = COUNT(*) BY event.action, event.outcome
        | SORT events DESC
      params:
        - name: provider
          type: string
          default: taskManager
    - id: slow-task-runs
      title: Slow task runs
      description: Task manager runs that took at least the given number of milliseconds
      query: |
        FROM .kibana-event-log-ds
        | WHERE event.provider == "taskManager" AND event.action == "task-run"
        | EVAL duration_ms = event.duration / 1000000
        | WHERE duration_ms >= ?min_duration_ms
        | KEEP @timestamp, kibana.task.type, duration_ms, event.outcome
        | SORT duration_ms DESC
        | LIMIT 100
      params:
        - name: min_duration_ms
          type: number
          default: '1000'
    - id: rule-failures
      title: Rule failures
      description: Failed rule executions grouped by rule and error
      query: |
        FROM .kibana-event-log-ds
        | WHERE event.provider == "alerting" AND event.action == "execute" AND event.outcome == "failure"
        | STATS failures = COUNT(*) BY rule.name, error.message
        | SORT failures DESC
```

If a canned query has a placeholder that isn't listed under `params`, it is treated as a string parameter. A canned query runs as soon as every parameter has a value.
