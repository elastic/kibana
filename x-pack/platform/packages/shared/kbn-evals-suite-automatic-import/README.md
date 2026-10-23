# @kbn/evals-suite-automatic-import

Measures how accurately Automatic Import maps vendor logs to ECS. Each example runs a full analysis on log samples from an integrations repo data stream, then compares the generated documents with that integration's expected output.

## Running

```bash
node scripts/evals start --suite automatic-import --model <connector-id> --judge <connector-id>
```

The judge decides whether generated fields that the expected output doesn't have are correct (see [Scoring rules](#scoring-rules)); everything else is computed in code. Keep the judge the same across runs you compare, because a different judge can move the precision scores. Use a judge from a different model family than the model under test, since models tend to favor their own output; the baseline uses GPT-5.4 to judge Claude.

The suite starts Kibana with the `evals_automatic_import` Scout config set, which enables the Automatic Import plugin. A trial license is the default.

Each data stream has one description, and like real users' descriptions they're a mix: some terse ("Firewall logs"), some naming the product, and some detailed about the product and format.

Each example is a full analysis that takes minutes, so the suite runs 3 at a time by default; `--concurrency` overrides it. Scores for the same data stream vary from run to run, so each example runs 3 times by default; `EVAL_REPETITIONS=1` gives a quicker, noisier run. Set `AUTOMATIC_IMPORT_DATASETS=vendor_a_signon,vendor_k_app` to run only some data streams.

To run the suite on a pull request, add these labels:

- `evals:automatic-import`
- `models:eis/anthropic-claude-4.6-sonnet`, or another model to test; the suite doesn't run without a `models:` label
- `models:judge:eis/openai-gpt-5.4`, to keep the judge the same as the baseline's

## How an example runs

1. Upload the samples to a new data stream.
2. Create the integration with that data stream, which schedules the analysis.
3. Poll until the data stream is `completed` or `failed`.
4. Fetch the generated ingest pipeline.
5. Run that pipeline on every sample with Elasticsearch's simulate API, so each output document lines up with its expected document.
6. Delete the integration.

Integration IDs are neutral (`vendor_a_<random>`), so the model can't recall the real package by name.

## Scores

Every score is per data stream; the report averages them, so each data stream counts equally.

- **ECS F1**: the headline mapping accuracy, combining recall and precision.
- **ECS recall**: the share of expected ECS fields that the generated documents got right.
- **ECS precision**: the share of generated ECS fields that are correct: they match the expected value, or the expected output doesn't have the field and the value checks and the judge accept it.
- **Categorization F1**: ECS F1 on `event.kind`, `event.category`, `event.type`, and `event.outcome` only. These fields say what each event means, so context such as descriptions should help them most, but they're only about 15% of the scored fields, so their changes barely move ECS F1.
- **Run success**: the share of samples the pipeline parsed without errors; 0 if the analysis failed or the pipeline mapped no ECS fields, which is what happens when the agent gives up and keeps the boilerplate pipeline.
- **Iterations**: how many times the agent built the pipeline: 1 when the review accepted the first pipeline, and one more for each time the review sent it back. Lower is better, but an agent that gives up early also scores low, so read it alongside the accuracy scores. It counts the pipeline generator's spans in the analysis trace.
- **Latency**: seconds the analysis took, from its trace, so time waiting for a Task Manager slot doesn't count. Lower is better, but a failed analysis can be fast, so read it alongside run success.
- **Tokens**: input and output tokens across the analysis's model calls. Automatic Import runs the agent in one trace tagged with the integration ID, so the suite can find it.

A failed analysis scores 0 on every accuracy score, and a sample that failed to parse counts as missing all its expected fields. Each run is one attempt: the suite takes the first failure as final instead of waiting for Task Manager to retry, and an analysis that Task Manager stops after 30 minutes counts as failed.

## Comparing runs

To check whether a change helps, compare it with a baseline:

1. Run the baseline and note the experiment ID it prints.
2. Run the change the same way, with the same model and judge.
3. Compare them with paired t-tests on every score:

   ```bash
   node scripts/evals compare <change-experiment-id> <baseline-experiment-id>
   ```

Any change to the data files or the scoring rules changes the scores too, so re-run the baseline after one.

## Scoring rules

The rules are in [`src/scoring/field_rules.ts`](src/scoring/field_rules.ts).

- Every ECS field in the expected output is scored by value, except pipeline and framework metadata (`ecs.version`, `event.original`, `tags`, `data_stream.*`, and similar), `event.timezone` (which integrations set from a setting, not the log), GeoIP and ASN enrichment, `related.*`, and fields a sample lists in `unscoredFields`. A sample lists a field there when its expected value isn't stable, or when it comes from the integration rather than the line:
  - `observer.vendor` and `observer.product`, which integrations hard-code, are unscored on every line that doesn't contain their expected value.
  - `@timestamp`, `event.start`, and `event.end` are unscored where the line's times have no time zone and the expected value takes one from the integration's test settings.
  - `host.name` is unscored where the expected value is the integration's default host name, such as `testhost.local`.
- Non-ECS fields, such as the vendor namespace, aren't scored.
- Values are normalized, so numbers and numeric strings, timestamp precision and offsets (a timestamp without one is read as UTC), IPv6 notation, and array order don't cause false mismatches.
- Arrays of objects, such as the ECS `nested` field `email.attachments`, are scored per sub-field: `email.attachments.file.name` is compared as the list of every attachment's name.
- ECS allows some field groups for the same entity, so they count as the same field: `client.*` and `source.*`, `server.*` and `destination.*`, and `host.*` and `observer.*`. For example, `source.ip` matches an expected `client.ip`.
- A generated field that the expected output has with a different value is wrong. A generated field that the expected output doesn't have at all is an extra field. Mapping more of the log is good, so an extra field counts as correct if:
  1. its value is valid ECS: it fits the field's type (an IP for `source.ip`, a whole number for `http.response.bytes`), it's one of the field's allowed values other than `event.kind: signal` (which only Kibana alerting sets), and `event.type` is one ECS allows for the doc's `event.category`; and
  2. the judge decides the values are right for their log lines. The judge sees each extra field's ECS description, up to 5 example lines with their values (each distinct value first, then more lines whose value repeats), and rules once per field for the whole data stream. For `event.kind`, `event.outcome`, and `event.created`, it also gets how Elastic integrations use the field, from the integration authoring guidelines. Verdicts on borderline fields can flip between calls, so the judge votes 3 times and the majority decides. A vote that fails or takes over 5 minutes is left out; if every vote fails, the judged scores for that run are left empty rather than stopping the whole experiment. The rules are in [`src/scoring/ecs_value_checks.ts`](src/scoring/ecs_value_checks.ts) and [`src/extra_field_judge.ts`](src/extra_field_judge.ts).
- When an expected value is missing from its field but appears under another one, the ECS recall explanation lists it. That doesn't change the score; pairs that keep showing up are candidates for the equivalent list.

The expected documents contain only ECS fields; the integrations' vendor-specific fields were removed.

## Datasets

`datasets/data/` holds one self-contained file per data stream, with its title, description, and samples. Each sample is a log line and its expected ECS document. To add a data stream, add a file there.
