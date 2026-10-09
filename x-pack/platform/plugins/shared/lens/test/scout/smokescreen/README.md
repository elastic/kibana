# Lens smokescreen namespace

A small, deliberately curated set of Lens editor tests that cover the flows we consider
critical enough to verify on **every** deployment we ship: self-managed / ECH stateful and
the serverless project types that have a stateful counterpart.

## What belongs here

A spec belongs in this namespace when it is an **end-to-end Lens editor flow** — configure a
chart, save it, reopen it, switch its type — rather than a test of one narrow feature. Concretely:

- creating a chart from scratch and verifying it round-trips through save/reopen
- switching between chart types and asserting the configuration is preserved
- switching a layer's data view or data source

A spec does **not** belong here if it targets a single visualization type's styling options, a
palette, a formula edge case, drag-and-drop mechanics, or anything that needs feature flags or a
non-default server config. Those stay in the `core` namespace. The value of this namespace comes
from staying small.

## Environment tags

The end state is `tags.deploymentAgnostic` from `@kbn/scout`, so a single spec runs on stateful and
on serverless search / observability_complete / security_complete.

For the first round of the FTR-to-Scout migration the specs are tagged `@local-stateful-classic`
only. Serverless coverage is a follow-up: it needs each spec verified against a serverless
project first, since the seeded archives, default data views and available UI differ there.

## Current contents

| Spec | Covers | Migrated from |
|---|---|---|
| `chart_creation.spec.ts` | saving and reopening an XY area chart, switching a saved XY chart to a filters aggregation, switching a layer's data view | `apps/lens/group1/chart_creation.ts` |
| `chart_switching.spec.ts` | switching seeded visualizations between types (legacy metric to datatable and back, XY to pie to bar, bar to line, pie to treemap) and asserting the configuration is mapped | `apps/lens/group1/chart_switching.ts` |
| `chart_switching_from_scratch.spec.ts` | building a pie chart then switching to a datatable, and building a heatmap then switching to a bar chart | `apps/lens/group1/chart_switching.ts` |
| `layers.spec.ts` | creating, duplicating, switching, and removing Lens layers; applying a treemap suggestion; keeping suggestions in sync with stacking subtype | `apps/lens/group1/layers.ts` |

`apps/lens/group1/chart_switching.ts` and `apps/lens/group1/layers.ts` are still loaded by the FTR
cross-cluster-search config (`x-pack/platform/test/functional/config.ccs.ts`), which Scout cannot
reproduce yet; they no longer run in the plain stateful FTR config.

## Running

```bash
node scripts/scout.js start-server --arch stateful --domain classic

node scripts/playwright test --project local \
  --config x-pack/platform/plugins/shared/lens/test/scout/smokescreen/ui/parallel.playwright.config.ts
```

See [`../README.md`](../README.md) for the other Lens namespaces and for serverless instructions.
