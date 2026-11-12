# Dreaming eval

Measures what Context Engine dreaming learns from agent conversations. It imports benchmark conversations as Agent Builder traces, lets AI indices dream on them, and judges the KIs they write against a list of target knowledge.

```sh
node scripts/context_engine_dreaming_eval.js                      # every stage, one LongMemEval S sample
node scripts/context_engine_dreaming_eval.js --stage extract,import
node scripts/context_engine_dreaming_eval.js --preset dev                 # the team's fixed 10 questions
node scripts/context_engine_dreaming_eval.js --preset dev --variant m     # the same, with 500-session haystacks
node scripts/context_engine_dreaming_eval.js --samples e47becba,0a995998
node scripts/context_engine_dreaming_eval.js --sample-count 5
node scripts/context_engine_dreaming_eval.js --dataset longmemeval_v2_enterprise
node scripts/context_engine_dreaming_eval.js --dataset longmemeval_v2_web --samples <question id>
node scripts/context_engine_dreaming_eval.js --dataset longmemeval_s --all-samples
node scripts/context_engine_dreaming_eval.js --stage evaluate --run-id 2026-11-12T08-00-00-000
node scripts/context_engine_dreaming_eval.js --stage ask              # answer agents, on the latest run's KIs
node scripts/context_engine_dreaming_eval.js --stage cleanup          # delete the traces, AI indices and agents
```

It needs a local Elasticsearch and Kibana from this branch. It uses `elastic:changeme` and reads the Kibana URL from `config/kibana.dev.yml` unless you pass `--es-url`, `--kibana-url`, `--es-username` and `--es-password`.

## Stages

Each stage reads what the previous one wrote, so you can rerun any of them on its own.

| Stage | What it does |
| --- | --- |
| `extract` | Downloads the datasets, picks the conversations the config asks for, and writes them with targets generated from the benchmark's questions. |
| `import` | Writes each round as Agent Builder OTel spans to `traces-agent_builder.otel-<space>`. A re-import replaces the dataset's earlier spans. |
| `configure` | Turns on Context Engine and memory, and creates or updates the AI indices of the config: an ES\|QL trace source over the datasets' agents, and their dreaming config. Creates or updates each AI index's answer agent too. |
| `run` | Per AI index: deletes the facts, entities and relationships dreaming wrote, runs each of its workflows until they have read everything (the first run from the earliest imported round), and dumps the KIs they wrote. A run that fails is run again (`run.retries`), from where the last completed run stopped. With `per_sample`, it does this once per sample (below). |
| `evaluate` | Per target: ranks the dumped KIs with a reranker, then asks an LLM whether the top ones hold the target knowledge. Writes scores by dataset and category. |
| `load` (optional) | Loads KIs someone else dreamed (`--from`): copies their dumps into a local run and writes them to the AI index. See [Sharing memories](#sharing-memories). |
| `ask` (optional) | Restores the run's dumped KIs to the AI index, puts each target's question to the AI index's answer agent, and asks an LLM whether its answer gives the reference answer. Runs when named, or with the others when `ask.enabled` is set. |
| `cleanup` (optional) | Deletes what the other stages created: the datasets' imported spans, the AI indices with their KIs and workflows, and the answer agents with their conversations. Keeps the files: downloads, extracts, and every run's dumps and results. Runs only when named. |

## Answer agents

The configure stage gives each AI index an Agent Builder agent, `<AI index id>-answerer` unless `answer_agent.id` names another. It is assigned only that AI index (so Agent Builder grants it the `ki-retrieval` skill), has the AI index tools (`list_ai_indices`, `describe_ai_index`, `query_ai_indices`), and its instructions say that the answer to every question is in the AI index, to search it before answering, and to say it does not know rather than guess. `answer_agent.instructions` and `answer_agent.tools` replace those; `answer_agent.enabled: false` skips the agent. The ask stage tells the agent the date a question is asked on, for questions about time, and records each answer's tool calls and AI index queries with its conversation, which you can open in Agent Builder.

## Datasets and samples

A dataset is a benchmark; a sample is one of its questions with the conversations it is asked over, its haystack. The extract stage imports the haystacks of the selected samples (each conversation once) and makes a target of each sample's question.

`run_datasets` in the config, or `--dataset`, picks the datasets; the stages work on the AI indices that dream on only those (`--ai-index` picks AI indices instead). Per dataset, the listed `samples` run, else those of the `preset`, else every sample with `all_samples`, else the first `sample_count`. `--samples`, `--preset`, `--sample-count` and `--all-samples` override them. By default one LongMemEval S sample runs.

**Presets** are named lists of sample ids in the config, so runs across the team compare. `longmemeval_s` has `dev`, 10 fixed questions across its 6 question types, and `dev_50`, those 10 and 40 more in proportion to the question types of the benchmark.

**One sample at a time.** With `per_sample` (the default for `longmemeval_s`, whose questions each have their own haystack; `--per-sample` turns it on), the run stage takes the samples in turn: it imports only that sample's conversations, deletes the dreamed KIs, dreams, and dumps the KIs to `runs/<run id>/<AI index>/samples/<sample>/kis.json`. A sample the run already dumped is skipped, so an interrupted run continues where it stopped when started again with the same `--run-id`. The evaluate stage judges each sample's targets against its own KIs, and the ask stage restores each sample's KIs before asking its questions.

**Retrieval without dreaming again.** The dumps hold the KIs' whole documents. `--stage ask --run-id <id>` (or `evaluate`) works on the KIs a run dumped: ask writes them back to the AI index first, so a change to the answer agent or retrieval can be measured on the same memories.

- **`longmemeval_s`:** [LongMemEval](https://github.com/xiaowu0162/LongMemEval), a personal assistant's chats with its user. `variant` (or `--variant`) picks the haystack size, with the same 500 questions in each: `s` (`longmemeval_s_cleaned.json`, 277 MB, about 50 sessions or 250 rounds a question), `m` (`longmemeval_m_cleaned.json`, 2.7 GB, about 500 sessions a question), or `oracle` (only the sessions that hold the answer). It downloads the file once and reads it as a stream, keeping only the selected questions. Each of the 500 questions has its own haystack; abstention questions are left out unless `include_abstention` is set. With `sessions: answers`, only the sessions that hold the answer and `distractor_sessions` more are imported, for a quicker run. Each user message and the assistant's answer is a round, at the session's date.
- **`longmemeval_v2_enterprise`** and **`longmemeval_v2_web`:** [LongMemEval-V2](https://github.com/xiaowu0162/LongMemEval-V2), a web agent's task trajectories, one dataset per domain. `enterprise` is a ServiceNow portal (WorkArena, 211 questions). `web` is three WebArena sites (240 questions): a Postmill forum (`webarena-reddit`), a Magento shop (`webarena-onestopshop`) and its admin (`webarena-cms`); `environments` keeps the questions of some of them. `haystack` picks the tier. In `small`, all questions of a domain share one haystack of 100 trajectories, so every sample runs by default, on that one. In `medium`, each question has its own haystack of about 500 (874 trajectories in all for enterprise, 599 for web), so one sample runs by default, on its own haystack (`per_sample`). `all_samples` and `per_sample` override those defaults. The extract stage downloads `trajectories.jsonl` (1.2 GB) once to `longmemeval_v2/`, for both domains, and streams it, keeping only the samples' trajectories (each haystack up to `max_trajectories`). Each trajectory is one round: the goal is what the user sent, each action is a `browser` tool call whose result is the page it led to, and the answer is how the task ended. Pages are cut to `max_observation_chars`, without the elements on most of the trajectory's pages, such as the navigation bar. Questions with a screenshot are left out unless `include_image_questions` is set; every `errors-gotchas` question has one, so that category runs only with it.

## Config

[`config/default.yaml`](config/default.yaml) lists what to import and the AI indices that dream on it. Copy it and pass it with `--config` to try other dreaming configs or subsets without changing code. An AI index names its `datasets` and a `dreaming` config: a built-in `template` (from `public/assets/dreaming_templates`), its own `instructions`, `facts`, `entities` and `relationships`, or both.

## Sharing memories

Dreaming takes long; retrieval can be tuned on memories someone already dreamed. Share a run's folder, `data/context_engine_dreaming_eval/runs/<run id>/` (or one AI index's folder of it): it holds the KIs as whole documents and the targets the run was made for. Whoever gets it runs:

```sh
node scripts/context_engine_dreaming_eval.js --stage configure,load,ask --from ~/Downloads/dev-full-1
```

The optional `load` stage copies the dumps into a run of the same id (or `--run-id`), so `evaluate` and `ask` work on them, and writes the KIs to the AI index, visible in the config's space. A single AI index's dumps load into the single AI index the run works on, whatever its name was; otherwise they load by AI index id. Samples that ran one at a time are written by the ask stage, each before its questions, or by `load` with `--samples <sample>` to look at one in Agent Builder. Neither `load` nor `ask` dreams, and neither needs the datasets downloaded.

## Output

Everything goes to `data/context_engine_dreaming_eval/` (`data_dir`), which git ignores:

- `<dataset>/extracted.json`: the conversations, as rounds of a user message, tool calls and an answer.
- `<dataset>/targets.json`: the targets generated from the benchmark's questions.
- `<dataset>/import.json`: what was imported, and when the earliest round is.
- `runs/<run id>/<AI index>/kis.json`, or `samples/<sample>/kis.json` per sample: the KIs a run wrote (whole documents), with the workflow runs and what each read and wrote.
- `runs/<run id>/<AI index>/evaluation.json` and `summary.md`: each target's verdict, the KIs that hold it, and scores.
- `runs/<run id>/<AI index>/answers.json` and `answers.md`: the answer agent's answer to each question, its tool calls and queries, the verdict, and scores.

## Targets

A target is a question and the answer the AI index should be able to give from its KIs, without the conversations:

```json
{
  "id": "e47becba",
  "dataset": "longmemeval_s",
  "category": "single-session-user",
  "question": "What degree did I graduate with?",
  "answer": "Business Administration",
  "knowledge": "The user graduated with a degree in Business Administration.",
  "askedAt": "2023-05-30T23:40:00.000Z"
}
```

`knowledge` is optional: it states the knowledge directly. The generated targets are the benchmarks' own questions, so they test what a question needs rather than everything worth learning. To evaluate against a curated list, write target files and list them under the AI index's `targets` in the config.

The judge rates each target covered (1), partial (0.5) or missing (0), and the score is their mean. It uses `--judge-connector`, then `evaluate.connector_id`, then Kibana's default AI connector, then the first Elastic Inference Service connector.
