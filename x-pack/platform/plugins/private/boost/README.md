# Search boost (prototype)

Prototype of the serverless **Search boost** page for Elasticsearch and Vector DB projects: the
project's boost defaults for indices and for data streams, above the boost profiles and boost rules
that tune specific ones. Each default is the profile its default boost rule uses, which applies to
whatever no other rule matches: an Elastic-managed preset, or a custom profile.

- The page is a sibling of Index Management under **Data management → Indices and data streams**.
- State is stored in the hidden, project-wide `boost_prototype` saved object type, so everyone using
  a shared deployment sees the same configuration. Payloads mirror the Elasticsearch `_boost` API
  so the store can later be swapped for the real API.
- Sample indices and data streams are created the first time someone who can manage boost loads
  Kibana. "Restore prototype defaults" (the flask menu in the global header) resets the boost
  configuration and re-creates any missing sample data. Sample data is created with the signed-in
  user's privileges, since Kibana's service account cannot create user indices.
- The same menu's "Show cost and VCU estimates" switch hides every search cost and VCU estimate.
  It's each tester's own setting, kept in their browser's local storage, and on by default.
- The saved object type is registered as a work-in-progress type (see
  `src/core/packages/saved-objects/server-internal/wip_types.json`).

Enable it with:

```yaml
xpack.boost.enabled: true
migrations.allowWipTypes: ['boost_prototype']
```
