# Isomer

Hosts Kibana's shared Isomer runtime with its primitive packs, and materializes saved objects into Isomer nodes. The plugin is server-only and always enabled.

## Runtime

The start contract's `getRuntime()` resolves a `createKibanaIsomerRuntime` with `@kbn/isomer-components`' `componentsPack`. Primitive schemas stay in memory for the life of the process once built, so the runtime and its packs load on the first call rather than at startup, and every later call shares that runtime. Call `getRuntime()` when a request needs it, not during `setup` or `start`.

## Materialization

`materialize` turns a saved object, by ID or by its as-code config, into a known Isomer node that renders on every surface. Anything it can't produce becomes an `unsupported` node with a reason, so it never returns something that doesn't render.

- **Registry.** Each saved object type has at most one `Materializer`, registered with `registerMaterializer(type, materializer)` on the setup contract. A materializer parses the type's as-code config, optionally loads a saved object as that config, plans the data it needs as `DataRequest`s, and maps the config and results to a node. It never queries itself. The current pipeline does not execute data requests; a non-empty plan returns an `unsupported` node.
- **In process.** `asScoped(request).materialize(input, context)` on the start contract runs as the user who made `request`. `context` carries the time range, query, filters and ES|QL control values; hosts keep `filters` as their state and pass them back to materialize again. Time-zone and locale values are passed through as supplied; defaults are not applied yet. `filtersForSelection(event, node)` is part of the contract but rejects until selection conversion is implemented.
- **Over HTTP.** `POST /api/isomer/materialize` (version `2023-10-31`) takes `{ input, context }`, with `context` fields in snake case, and returns an Isomer composition holding the node. It runs with normal Kibana authentication, as the requesting user.

### Pipeline

Every `materialize` call runs one pipeline, as the requesting user:

1. **Context.** Each data request runs in the caller's context merged with the request's own override: its fields replace the caller's, its filters add to the caller's, and `ignoreGlobalFilters` drops the caller's filters and query. Nested `materialize` requests (a dashboard's panels) pass the merged context down.
2. **Execution.** `esql` requests run through the data plugin's scoped `search.esql`, the way Lens's `esql` expression does: the time range, filters, query and ES|QL control values go through its Kibana query context, and `dateFormat:tz` is the default time zone. Each request has a 30 second timeout and a cap of 1,000 rows, ES|QL's default result size; a request may set a lower `maxRows`. A capped table adds a `losses` entry to the node. `aggs` and `search` requests have no executor yet and return `unsupported`.
3. **Mapping and provenance.** The materializer maps the results. Charts pack nodes get `source` provenance (Kibana version, saved object type and materializer version, saved object ID, time range, capture time) and the pipeline's losses.
4. **Validation.** Every result is validated against the runtime's packs. A failing plan, query, mapping or validation returns `unsupported` with a reason, titled from the materializer's `describe` when it has one.

Materialization is off unless the `isomer.materializeEnabled` feature flag is on. While it's off, the route returns `404` and `materialize` returns `unsupported`. To turn it on locally, add this to `kibana.dev.yml`:

```yaml
feature_flags.overrides:
  isomer.materializeEnabled: true
```

`server/materialize/nodes.ts` is the only module that names the node types materialization produces.
