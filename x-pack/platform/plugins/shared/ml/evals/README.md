# @kbn/evals-suite-ml

Evaluation suites for ML Agent Builder skills (owned by `@elastic/ml-ui`).

## Anomaly detection skill

Specs live under `anomaly_detection_skill/` and exercise the built-in ML anomaly-detection skill against Agent Builder.

```bash
node scripts/evals start --suite ml --grep "ML Anomaly Detection"
```

These evals reuse the Agent Builder chat/evaluate harness from `@kbn/evals-suite-agent-builder` and the `evals_agent_builder` Scout server config set.
