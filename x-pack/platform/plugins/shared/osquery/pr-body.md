## Task 4.1 PR description update

Add to Changes/Review: Scout coverage reads the stored action origin for both `osquery.runQuery` and generic `kibana.request` workflow dispatches and compares it with the engine execution ID. It checks that Live/Rule filters exclude the generic workflow action, that a public caller forging the execution header and retired dispatch headers stores no origin and is excluded from the Workflow filter, and that both live-index origin fields are keyword.

Validation: scoped eslint passed before a final assertion correction. Scout discovered 13 tests in the touched file but could not start Elasticsearch because the snapshot manifest host failed DNS resolution. Scoped TypeScript checking identified an unsupported matcher, which was corrected; validation stopped at the two-attempt limit without a confirming rerun. Runtime coverage is added but has not been demonstrated passing locally.
