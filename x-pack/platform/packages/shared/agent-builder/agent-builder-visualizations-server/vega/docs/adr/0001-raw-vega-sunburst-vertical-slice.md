# Raw Vega via Dialect gate; Sunburst as first vertical slice

Agent Builder already authors Vega-Lite under `renderer: "vega"`. We need Raw Vega for charts Vega-Lite cannot express, but free-form Raw Vega is high-variance and unsafe to leave to the authoring model. We decided to add dual-Dialect plumbing with a classifier-backed allowlist (Dialect gate), ship Sunburst first as a Static diagram over a Parent–child table and a single Canonical ES|QL source, pin edit Dialect from `$schema`, validate with a schema-branched headless worker, and keep Allowlist refusal for Sankey/radar/etc. until each chart lands with its own examples.

**Considered options:** model-chosen free-form Raw Vega; keyword-only routing; Sankey-first slice; multi-dataset ES|QL passthrough in v1; always re-classify on edit.

**Consequences:** create path is classify-then-query; sunburst data failures use Disclosed fallback; chart-family switches on edit are treated as recreate, not silent Dialect flips; later charts reuse the same gate/normalize/validate seams.
