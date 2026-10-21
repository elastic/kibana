# Ported converter

Lowering and planning from `adaptive-ui`'s `packages/adaptive-ui-convert-kibana/src` at `822dc2f7`, with upstream's layout kept so files diff against their originals. Only what `parseSavedObjectNdjson`, `fromKibanaDashboardSavedObject`, and `planAdaptiveDashboard` reach is here, with the upstream tests that cover it.

Changes from upstream:

- `adaptive_nodes.ts` defines the body-node and view-spec types locally instead of importing them from the Adaptive UI packs and runtime.
- `Tone` comes from `@elastic/alembic-pack-echarts/definitions`, and `z` from `@elastic/isomer-sdk`.
- `plan/plan_adaptive_dashboard.test.ts` and `plan/plan_adaptive_lens.test.ts` keep their planning assertions and drop the ones that bound through `bindViewPlan` or validated against the Adaptive UI runtime, which Alembic replaces.

`fixtures/__snapshots__/*.plan.json` were recorded from the linked package before the port, so they pin both dashboards' ES|QL, chart metadata, and specs to upstream's output.
