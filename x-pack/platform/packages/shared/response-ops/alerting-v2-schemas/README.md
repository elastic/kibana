# @kbn/alerting-v2-schemas

Zod schemas and shared types for alerting v2 requests.

## Alert reason templates

The rule API schemas accept an optional top-level `reason` object whose `template` is an alert
reason template, for example `{ "template": "CPU on {{host.name}} was {{cpu_pct}}%." }`.
The object wrapper leaves room for future options, such as a reason per state.
Only rules with `kind: "alert"` can configure a reason; create, PUT, and bulk-create
requests reject it on `signal` rules. PATCH carries no `kind`, so the rules client validates
this restriction after merging with the stored rule.
`MAX_REASON_TEMPLATE_LENGTH` exports the 1,024-character limit for API and UI
consumers. Empty or whitespace-only templates are rejected; accepted text keeps
its original whitespace. These schemas do not render templates or validate field
references.

| Schema                         | Omitted `reason`                                    | `reason: null`    |
| ------------------------------ | --------------------------------------------------- | ----------------- |
| Create (including bulk create) | Leaves the reason unset                             | Rejected          |
| PUT replacement/upsert         | Leaves it unset on create; clears it on replacement | Rejected          |
| PATCH                          | Preserves the current value                         | Clears the reason |
| Response                       | Indicates that no template is set                   | Rejected          |

The rules client persists the field on create, PUT, and PATCH, and returns it in responses.
