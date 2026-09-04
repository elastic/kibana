# Alerting v2 rule builder example

A worked example of contributing a rule builder to Alerting v2 from outside the alerting plugin.
It adds an **APM latency rule** builder: pick a service, a latency percentile and a threshold, and
the server generates the rule's ES|QL from those parameters.

Enable it with `--run-examples` (or `xpack.alerting_v2_rule_builder_example.enabled: true`), then
open **Alerts → Rules → Create rule**; the builder appears alongside the built-in ones.

## Key files

| File | What it shows |
| --- | --- |
| `common/apm_latency/schema.ts` | Bounding `metadata.builder_fields` so registration accepts it |
| `common/apm_latency/generate_query.ts` | Deriving the rule's ES|QL from those fields |
| `server/plugin.ts` | `registerBuilderType` — all that is needed to author rules over the API |
| `public/apm_latency/builder.ts` | `registerRuleBuilder` — the create-options card and the fields |
| `public/apm_latency/apm_latency_step.tsx` | Reading and writing builder state from a form |

The fields, the schema and the generator live in `common/` because the browser reuses them: the
form is validated with the same schema the server validates with, and previews the query with the
same generator, so the preview cannot drift from what gets stored.

Two things a builder does *not* have to do, both visible here:

- **Adapt to the rule kind.** `generateQuery` returns a composed query; a signal rule receives it
  flattened onto its breach segment.
- **Adapt its form state.** This builder's state is already the stored shape, so it implements no
  `toFields`/`fromFields`. The threshold builder does, because its form carries React list keys.

For the full contract, see
`x-pack/platform/plugins/shared/alerting_v2/docs/rule_builder_registration.md`.
