# Deferred eval ci defaults

Declarative CI defaults and fanout/baseline forwarding. The preserved golden selection must be adapted before use with the narrowed runner. The independent baseline compatibility implementation remains in PR #291009.

Source: `b656789f07c89379c2d82deb34636f262138fdc5`; base: `b0a6c50cf43447489e6f93aa4820105f0732c3e8`. Original complete snapshot: `nightshift/archive-291002-b656789f`. Preserved for follow-up; not validated on this extracted branch. Historical validation is in PR #291002 before its scope rewrite. None of this branch is required for task 1 of deductive-ai/deductive#10565.

## Historical implementation notes

## Environment and CI

| Variable | Effect |
| --- | --- |
| `NIGHTSHIFT_DATASETS` | Unset, `all` or `investigate-lite` selects the lite golden eval. `synthetic-smoke` selects the seed smoke eval. Unknown values fail early. |
| `SANDBOX_API_KEY` | Required local sandbox-api key, shared by Scout and sandbox-api. |
| `SANDBOX_CLIENT_CERT_PATH`, `SANDBOX_CLIENT_KEY_PATH` | Required PEM client certificate and key paths for sandbox-api mTLS. |
| `SANDBOX_CA_CERT_PATH` | PEM server CA path; required for the local self-signed setup, optional with a publicly trusted server certificate. |
| `SANDBOX_API_HOST`, `SANDBOX_API_PORT` | Override `localhost:9090`. |
| `NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL` | Elasticsearch URL reachable inside the sandbox; default `http://host.docker.internal:9220`. |
| `SELECTED_EVALUATORS` | Standard native filter by evaluator name. Acceptance evidence uses all 23. |
| `GCS_CREDENTIALS` | Needed only for seed snapshots; supplied through profile `gcsDatasetAccessCredentials`. |

Registered as `nightshift-investigations` in
[`evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json). Local CLI runs
use the golden profile and Scout config `evals_nightshift_investigations` by default.

PR and weekly CI retain the existing `synthetic-smoke` coverage with `evals_tracing`, which
needs no sandbox. The suite declares both as CI defaults in its `ci` block in
[`evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json); the CI runner
applies them before startup and forwards the selection to model jobs and baseline refreshes.
**Wiring the sandbox launcher into CI is deferred to a separate change**; the credentialed local
acceptance run is the golden baseline. A provisioned job
can explicitly select `NIGHTSHIFT_DATASETS=investigate-lite` and
`EVAL_SERVER_CONFIG_SET=evals_nightshift_investigations` with the private dataset and sandbox
configuration above. Use `--judge` explicitly for the reference comparison.

Validation:

```bash
node scripts/jest x-pack/platform/packages/shared/kbn-evals-suite-nightshift-investigations
node scripts/check.js --scope=local
```
