# Statistical Contract
This contract is scoped to common paired-comparison cases.

## Test categories

1. **Numeric** (all continuous/count paired metrics: RAG, LLM Quality, Latency, Efficiency)
   - Primary test: Wilcoxon signed-rank (two-sided)
   - Primary effect size: paired rank-biserial correlation (`r_rb`)
   - CI: bootstrap 95% CI for mean paired difference (`baseline - variant`)

2. **Binary** (genuine 0/1 paired outcomes: ToolUsageOnly, DocVersionReleaseDate, ES|QL Functional Equivalence)
   - Primary test: exact McNemar via binomial test on discordant pairs
   - Primary effect size: odds ratio with Haldane-Anscombe correction
   - CI: not reported in V1 for binary rows (summary CI column is `n/a`)

Display labels (RAG, LLM Quality, Latency, Efficiency) are presentation-only and do not affect test selection. All numeric metrics use the same Wilcoxon + r_rb pipeline.

Override channels are intentionally separate:

- `EVAL_METRIC_DISPLAY_LABEL_MAP_JSON` changes display labels only.
- `EVAL_METRIC_TEST_CATEGORY_MAP_JSON` changes test selection only (`Numeric`, `Binary`, `Excluded`).

## Out of scope in V1

- Multi-class categorical inferential testing
- Unpaired comparisons
- Repeated-measures mixed-effects inference

Unknown metrics are reported as unsupported unless explicitly mapped to a test category.

## Pairing and aggregation rules

- Pair key after aggregation: `(dataset_id, example_id, evaluator_name)`
- Repetition aggregation:
  - Numeric: mean across repetitions
  - Binary: majority vote
  - Exact 50/50 binary ties: dropped and counted in diagnostics

## Significance rules

- Holm-Bonferroni correction is applied within `(dataset, variant)` groups.
- Only **primary** p-values are corrected.
- Alpha is configurable via `--alpha` (default `0.05`).

## Output interpretation

- `Sig=pass` means Holm-adjusted primary p-value < configured alpha.
- CI exclusion alone is not treated as final significance when correction is applied.
- Reported effect-size magnitude labels are family-specific.
