# @kbn/evals-suite-agent-builder-dashboards

Evaluation test suite for Agent Builder Dashboards behavior, built on top of [`@kbn/evals`](../../kbn-evals/README.md).

## Overview

Offline LLM evals for the dashboard skill (`dashboards`) and the `platform.dashboard.generate_dashboard` tool. The suite drives the full `/api/agent_builder/converse` flow and scores the dashboard the agent wrote. That dashboard is read from the conversation's attachments, not from the tool result, because the tool result is a compact summary without panel configs, ES|QL, controls, or time range.

The layout mirrors `@kbn/evals-suite-agent-builder-visualizations`: one evaluator stack built in `src/evaluate_dataset.ts`, datasets built by factories in `evals/dashboards/datasets/`, `score: null` for skips, and low-score logging that prints the produced dashboard (one line per panel, with its grid and ES|QL).

Chart presentation is checked on each panel's Lens Config API config, against the rules in "Prettify — agent rules": panel titles by chart type, axis titles, legends, fills, palettes, and number formats. Checks that need an executed panel query are out of scope: Lens config validity, ES|QL correctness, and column bindings. Every panel goes through the same authoring path as `create_visualization`, which validates the config, and the visualization suite scores that path in depth. The one query the suite does run is each control's values query, because a control on a field the index does not have is the broken dropdown users see.

## What it evaluates

- **Dashboard Skill Routing** (`CODE`): the request reaches the skill its gold `route` names. `dashboard` loads the dashboards skill, `visualization` loads visualization creation without generating a dashboard, and `none` uses neither. Enhance examples also have to read `dashboards/enhance.md`; that path is taken from the same `read_file` / `filestore.read` steps.
- **Dashboard Structure** (`CODE`): what the prompt pins down. That is a panel count range, an exact number of panels per kind (`{ metric: 6 }`), a section count, and sections matched by title terms, minimum size, and the ES|QL their panels must run, and rows read top to bottom: each row's panels share a top and height directly below the previous row, optionally full width, and a row marked `atTop` is the top row of the dashboard (inside a section, the section must be at the top too). Scored as the fraction of gold assertions that hold.
- **Dashboard Time Range** (`CODE`): the dashboard ends up with the gold `timeRange`. Creation prompts name no time window, so the gold is the data-aware default for the sample logs, `now-24h` to `now`. The open-ended creation example also sends a home page screen context with a deliberately improbable `now-37m` to `now-3m`, which must be ignored; a copy is labelled `copied-screen-time-range`. Scores 1 or 0.
- **Dashboard Layout Rules** (`CODE`): panels stay inside the 48-column grid, no two panels overlap in a section, and no metric or gauge spans the full width.
- **Dashboard Composition Order** (`CODE`): metric and gauge panels come before other charts, in the top level and in every section. Panels are read top to bottom, then left to right, so a metric to the right of a chart in the same row counts as after it.
- **Dashboard Titles & Labels** (`CODE`), checks:
  - the dashboard has a real title
  - metric and gauge panels have no panel title
  - xy, heatmap, map, table, pie, treemap, mosaic, tag cloud, and waffle panels have one
  - xy axis titles are hidden (`axis.<x|y>.title.visible: false`)
- **Dashboard Chart Styling** (`CODE`), checks:
  - area series don't set `styling.areas.fill: 'solid'`
  - xy legends sit outside at the bottom with `visibility` set, because unset hides the legend
  - pie panels leave `legend` to Lens
  - metrics color the value, never the background, and set a primary metric's `apply_color_to` only together with its `color`
- **Dashboard Color & Format** (`CODE`), checks:
  - no legacy palettes (`eui_amsterdam`, `kibana_v7_legacy`, `elastic_brand_2023`)
  - no static series or slice colors on charts that should use the default palette (reference lines and annotations may keep theirs, and so may a panel whose `panelEdits` gold asks for a color)
  - no percent format on a column the query already scales to 0–100 (`100 * …`), which Lens would show as `8.8k%`
- **Dashboard Controls** (`CODE`): at most 5 filter controls and one time slider, none on id-like fields. Skipped when the dashboard has no controls.
- **Dashboard Control Queries** (`CODE`): every stored control's values query (`FROM <index> | STATS BY <field>`) executes against the cluster. A control on a column the index does not have, such as a `DISSECT` output, fails with "Unknown column" and renders as a broken dropdown. Scored as the fraction of controls whose query executes, with the number of values each would offer in the metadata. Skipped when the dashboard has no controls.
- **Dashboard Control Sourcing** (`CODE`): controls query the index directly, so a control on a column that only exists in an ES|QL result (`DISSECT`, `GROK`, `EVAL`) renders "Unknown column". Gated on a gold `controls` block that lists the index's mapped fields. Scored as the fraction of these assertions that hold:
  - every stored control is on a mapped field, by exact name; the field list names the real `.keyword` siblings
  - every control the agent asked `generate_dashboard` for is on a mapped field, read from the `controls` in the tool params, since the server drops unmapped controls before they are stored
  - at least one control carries `user_requested` when the prompt asked for controls, and none does otherwise; the agent may add controls of its own next to the requested ones, but asking `generate_dashboard` for no control at all when the prompt asked for some fails
  - a control exists on each field the prompt names (`mustInclude`), and none on a field it removes the control of (`mustExclude`)
  - a range slider, not another control type, is on each field the prompt asks one for (`rangeSliders`)
  - when the gold sets `timeSlider`, the dashboard keeps exactly one time slider (`true`) or none (`false`)
  - the reply repeats no raw control error text
  Whether the reply accounts for requested controls it could not add is judged by Dashboard Reply. On a seeded example the agent never wrote, it scores 0, since the seed has none of the requested controls. Here and in the other evaluators, a `generate_dashboard` call that left the dashboard as it was counts as no write.
- **Enhance Mode Question** (`CODE`): a bare "enhance" request ends the opening turn with one `ask_user_question` offering an appearance option and a content option, before anything is written. A request that names the mode does not ask.
- **Enhance Mode Compliance** (`CODE`), binary:
  - Appearance mode keeps every panel id, every panel's ES|QL, the controls and filters unchanged (compared by content, not count), and the time range. It may delete markdown panels.
  - Content mode keeps the time range and every seed panel. The exceptions are markdown panels and one copy of a duplicate. The check is which panels were removed, not how many, so deleting a chart and adding another does not pass.
  - Any broken invariant scores 0, and the broken ones are listed.
  - Abstains when the agent never wrote the dashboard, since an unchanged seed keeps every invariant trivially.
- **Enhance Defect Resolution** (`CODE`): the fraction of the seeded dashboard's declared defects the result no longer shows. Besides rule ids, a seed can declare seed defects that are judged against the seed itself, not by pattern-matching text. For example, `title_not_rewritten` holds when the title is unchanged from the seed, and `markdown_not_rewritten` holds when a seeded markdown panel still has its seeded text. A defect on a panel that was deleted without being allowed stays open, so deleting a broken chart does not count as fixing it; deleting a markdown panel is allowed in both modes, and appearance mode may delete nothing else. It abstains if the seeded dashboard does not actually show a declared defect, since that is a dataset bug.
- **Enhance No Regression** (`CODE`): scored rules the seed already met still hold after enhance. This catches, for example, a metric that gains a title, or a new panel that runs the same ES|QL as another. The score is the fraction of panels with no newly introduced violation. Like Mode Compliance, it abstains when nothing was written.
- **Dashboard Layout Edit** (`CODE`): a layout edit changes only what the prompt asked. It's gated on a gold `layoutEdit` block and compares the result with the seeded dashboard. Scored as the fraction of these checks that hold:
  - every seed panel and section the prompt does not remove still exists, and the removed ones are gone;
  - in every container (the top level or a section) the gold does not list under `changes`, the seed panels keep their grids. At the top level only `x`, `w` and `h` are compared, because adding or removing a section shifts the outer `y`;
  - the top-level panels and sections that survive keep their relative order;
  - collapsed sections stay collapsed;
  - the seed controls come back unchanged, unless the example also carries `controls` gold, which Control Sourcing scores instead;
  - each gold placement holds: the container, first in it, beside a panel (same row and height), below one, a width, or after and before another item in reading order. A placement names a seed id, or the first added panel of a kind or the first added section.
- **Dashboard Panel Edits** (`CODE`): a panel the prompt edits in place keeps its id and gets what was asked. It's gated on a gold `panelEdits` list, where each entry names a seed panel (or `{ added: kind }` for the first panel of that kind, in reading order, that the seed lacks) and describes it in the attachment's own shape: an embeddable `type` and a partial `config` (a Vega `spec` written as an object). These are subset-matched with the same rules as the visualization suite's Visualization Config vs Intent: only listed keys are checked, values compare strictly, arrays match in any order, and a `type` may list alternatives. Named checks cover what no exact value can: `color` (a static series color in a Lens data layer, or a Vega mark color: `color`, `fill` or `stroke` on a mark (unless its encoding sets the same channel, which wins), its encoding, or the `config` entry of a drawn mark type that sets no color of its own (`config.bar`, else `config.mark`), or a scale `scheme` or `range`, read from the HJSON spec. One within 20° of red or 25° of blue that is saturated and bright enough matches, so `#BD271E` counts as red while `#ffcccc` and `#330000` do not; CSS names of the hue and the Vega `reds` and `blues` schemes count too. Titles, gridlines, reference lines, annotations and other non-series colors do not), `bulletList` (two or more markdown items), `contentIncludes` (terms the markdown mentions, ignoring case) and `vegaMark` (a mark type the Vega spec draws in any view, such as `rect` for a heatmap). Scored as the fraction of edited panels that match, or 0 when the agent never wrote the dashboard. Dashboard Layout Edit still scores the rest of the layout on the same runs.
- **Dashboard Replace Confirmation** (`CODE`): the agent cannot edit a panel that reads a data view or an Elasticsearch query rather than ES|QL, such as a data-view Lens chart or a Vega chart over Query DSL. Gated on a gold `replaceConfirmation` naming that panel. Scored as the fraction of these checks that hold: the panel keeps its type and every seed config value, and the dashboard was not written before the user answered. Whether the agent asked to replace the panel is judged by Dashboard Reply. Dashboard evaluators skip these examples, since the seed comes back unchanged.
- **Dashboard Unavailable Requests** (`CODE`): a prompt that asks for something the data cannot back, such as an index that does not exist, next to a request it can. Gated on a gold `unavailableRequests` list. It checks that nothing was built for the request: every source the dashboard reads resolves to an index, alias or data stream on the cluster, and no section is left empty. Sources are the local index sources parsed from `FROM` and `TS` in Lens and Vega ES|QL and control queries (ENRICH policies and remote `cluster:index` sources are not checked), plus a Vega `url.index`; an Elasticsearch error other than index-not-found skips the example instead of failing it. It reads the dashboard, not its wording, so a built panel on the missing index fails whatever it is titled. On a seeded example the agent never wrote, it scores 0 rather than passing the seed. Whether the reply says it could not be added is judged by Dashboard Reply. With `noDashboard` gold, for a request nothing of which can be built, it scores only whether no dashboard was written (1 or 0); dashboard evaluators skip those examples.
- **Dashboard Reply** (`LLM`): whether the agent told the user what it could not do. The criteria are built per example from the gold and the stored dashboard, so the judge reads only the prompt, the agent's last reply and any `ask_user_question` questions, not the dashboard. It runs the kbn-evals criteria judge and scores the fraction of criteria met. Skipped when an example yields no criteria. The criteria are:
  - for each `unavailableRequests` entry, the reply says it could not be added because the data does not exist;
  - for `replaceConfirmation`, the reply or a question explains the panel cannot be edited in place and offers to replace it, leaving the replacement to the user's go-ahead (an explicit question is not required);
  - for `controls` gold that asks for controls, each `requestedFilters` entry with no stored control on a substitute is named as a filter that could not be added, and when more requested fields failed (each counted once) than a later call replaced with a stored control, the reply names the failed filters in plain words.
- **Trajectory**: `load_skill` → `generate_dashboard`. Content-mode enhance also expects `get_index_mapping` before the write, because it may change queries. Appearance mode changes no query, so reading the attachment is enough and the mapping call is not expected. Discover results examples read the attachment instead of the mapping, in every run on both models, so the mapping call is not expected there. Skipped on routing and replace confirmation examples.
- **Trace-based**: tokens, latency, and tool-call counts from OTel spans.

### Rules

Every check above is a rule in one registry:
- `src/evaluators/dashboard_rules.ts` holds the layout, composition, dashboard-level, and control rules.
- `src/evaluators/chart_rules.ts` holds the per-panel chart rules.

Each rule declares three properties:

- **Target:** the panel kinds it inspects, or the dashboard as a whole. A rule evaluator's score is the fraction of targeted panels, plus one unit per dashboard-level rule, with no violation. Every violation carries the panel id and the config path it points at, for example `layers[0].y[0].color`.
- **Strictness:** `must` rules come from "do not / never / always" guidance and are scored. `should` rules come from "prefer / aim / when possible" guidance, such as the default-size table, widths that divide 48, sections on dashboards with six or more charts, and gauge bands other than four. They are listed under `guidance` in the evaluator metadata and never scored, because they would flag valid layouts.
- **Scope:** `appearance` rules can be fixed in appearance mode, while `content` rules (the duplicated panel, missing controls) need content mode. Enhance examples are scored only on defects their mode may fix, and Mode Compliance checks that appearance mode left the rest alone.

Adding a rule costs nothing per run: it is a code check over the attachment the task already reads. To cover a new rule in enhance, give the seeded dashboard the defect and declare it.

Every check is deterministic except Dashboard Reply, which judges reply wording with an LLM so that no regex has to guess how the agent phrases it. What the reply must cover still comes from code.

## Dataset

Forty-two examples, because each dashboard example costs 150k–300k input tokens:

- **Creation** (`datasets/creation.ts`, 4): a rich logs dashboard, two requested sections, six compact KPIs, and four KPIs above a time series.
- **Routing** (`datasets/routing.ts`, 4): a standalone chart, ES|QL help, and field discovery, which must stay out of the dashboard skill, and a dashboard over a `nonexistent-*` index, which loads the skill but must end without a dashboard (`noDashboard`). Nothing is generated, so these are cheap.
- **Enhance** (`datasets/enhance.ts`, 3), all over the same seeded dashboard:
  - `[/dashboards](skill://dashboards) Enhance this dashboard`, the prompt the dashboard's "Enhance this dashboard" action sends. The agent should ask for the mode, and the task answers the `ask_user_question` prompt by picking "Appearance only".
  - Appearance mode named up front.
  - Content mode named up front.
- **Discover results** (`datasets/discover_results.ts`, 3), all over the same attached ES|QL results:
  - KPIs, trends and breakdowns, with no controls asked for. Any controls the agent adds on its own must be on mapped fields, and nothing about dropped filters belongs in the reply.
  - The prompt from [#294133](https://github.com/elastic/kibana/issues/294133): the same dashboard plus controls for HTTP method, status code, path and HTTP version, which only exist as `DISSECT` output. The agent either substitutes mapped fields or says in plain words which filters it could not add.
  - Four KPIs and a status code breakdown plus a control on machine OS, a mapped field the results do not show, to prove requested controls still get added.
- **Layout edit** (`datasets/layout_edit.ts`, 17), over the seeded sectioned dashboard: remove panels from one or two sections, remove a section, add a KPI, a chart in a section, or a section before or between others, move panels between sections and the top level, restyle or edit panels, set widths, add to a collapsed section, and empty a section. The two in-place edits (recolor and rename a chart; turn the pie into a table and the intro into a bullet list) also carry `panelEdits` gold.
- **Edit scenarios** (`datasets/edit_scenarios.ts`, 11), over the same seeded sectioned dashboard. Each example combines asks, so one run covers several gaps:
  - recolor the ES|QL Vega bars and raise the ML swim lane's severity threshold (`panelEdits`);
  - rename the data-view chart, which the agent must not edit silently (`replaceConfirmation`);
  - recolor the Vega bars on a variant whose Vega chart reads an Elasticsearch query; the agent must not edit it and should offer an ES|QL replacement (`replaceConfirmation`);
  - replace the OS filter with a destination country filter and remove the bytes slider (`controls`);
  - add a Payments section from a `payments-*` index that does not exist, next to a KPI it can add (`unavailableRequests`);
  - add two Lens ES|QL charts the agent made earlier in the conversation, sent as visualization attachments (`src/fixtures/logs_visualizations.ts`), in a new section whose panels must run their ES|QL (`structure.sections[].queries`);
  - add a range slider on `machine.ram` and remove the time slider (`controls.rangeSliders`, `controls.timeSlider: false`);
  - rename the Visitors section and move a panel out of it (`structure.sections` and a placement);
  - move the Vega chart to the top level, delete the ML swim lane, and swap the bytes slider for `machine.ram` (`removed`, a placement and `controls`);
  - add a markdown note, a second ML swim lane and a Vega heatmap to a section (`structure.panelKinds`, placements of the added kinds, and `panelEdits` on the note's terms, the swim lane's job and view, and the heatmap's `rect` mark);
  - delete the Errors section but keep its errors by host table, and recolor the 4xx chart while moving it into Traffic (`removed`, placements and `panelEdits`).

Every example carries `metadata.behaviour` (`creation` | `routing` | `enhance` | `discover_results` | `layout_edit` | `edit_scenario`) and `metadata.dataSource` (`logs`, or `logs_dissect` for the Discover results). Enhance examples also carry `metadata.enhanceMode`, so golden-cluster results can be sliced. `datasets/gold_ids.test.ts` fails when gold names a panel or section id its seeded dashboard does not have, so seed edits cannot silently zero an assertion.

### Seeded dashboard

`src/fixtures/messy_logs_dashboard.ts` is a working dashboard over `kibana_sample_data_logs`. Its defects sit on minimal ES|QL Lens configs, the kind that parse against the Lens ES|QL schemas, so appearance mode can enhance each of them in place. It also holds a data-view Lens bar chart, a Vega chart and an ML anomaly swim lane (`src/fixtures/non_esql_panels.ts`) with no defect. The agent cannot edit the data-view chart and has no reason to touch the others, so Mode Compliance and No Regression catch an enhance that drops or breaks them. It is sent as a by-value attachment with the opening turn, the same way the enhance action attaches the open dashboard. It declares its defects as rule ids.

Layout and composition defects:
- a placeholder title, which must be rewritten (`title_not_rewritten`; Dashboard Titles & Labels still flags a placeholder result)
- a full-width metric
- metrics placed after charts
- nine charts with no sections (guidance only, not a scored defect)

Chart defects:
- a titled metric
- untitled xy and pie panels
- visible xy axis titles and right-hand legends
- a solid area fill and a static series color
- a pie legend on a legacy palette
- a background-colored metric
- a percent format on a 0–100 column
- markdown with edit notes that must be rewritten or deleted (`markdown_not_rewritten`)

Content defects, which only content mode should fix:
- the same bar chart twice
- no controls

### Seeded sectioned dashboard

`src/fixtures/sectioned_logs_dashboard.ts` is a clean dashboard over `kibana_sample_data_logs`, the seed of the layout edit examples:
- at the top level, an intro markdown and four KPIs;
- a Traffic section (six panels);
- a note between Traffic and Errors;
- an Errors section (five panels);
- a Visitors section (three panels);
- an Other sources section with the same data-view Lens, Vega and ML panels as the messy seed, which no layout edit touches, so `stable.other-sources` shows they survive; the edit scenarios edit them;
- an options list, a range slider and a time slider, which only the edit scenarios change.

It breaks no `must` rule, so any gap, overlap or styling miss in a result comes from the edit. Its ids are readable, so the gold can name what a prompt moves. A variant with Visitors collapsed covers edits of a collapsed section.

### Attached ES|QL results

`src/fixtures/dissect_logs_results.ts` is what Discover attaches when a user clicks "AI Agent" over ES|QL results: the query, its columns, a few sample rows, the hit count and the time range, under the `esql.query_results` attachment type. The query parses the raw access-log line in `message` with `DISSECT` into `client_ip`, `http_method`, `path`, `http_version`, `status_code`, `response_bytes` and `user_agent`. None of these is mapped on `kibana_sample_data_logs`, and none clashes with a mapped field, so they are exactly the columns a control must not use. `src/fixtures/sample_logs_fields.ts` lists the mapped fields the Control Sourcing evaluator checks against.

These examples assume the control field validation from [#288080](https://github.com/elastic/kibana/pull/288080): unmapped controls the agent adds on its own are left out silently, and unmapped controls the user asked for come back under `failures` for the agent to report.

## Prerequisites

### Configure EIS Connectors

For local EIS-backed model runs, run the eval setup wizard:

```bash
node scripts/evals init
```

When `node scripts/evals init` finishes, copy the printed connector export into the same shell where you will run evals:

```bash
export KIBANA_TESTING_INFERENCE_ENDPOINTS="..."
```

This makes EIS inference endpoint IDs available as Playwright projects, for example `eis-anthropic-claude-4-5-sonnet`.

### Optional: Configure Phoenix and Tracing

`node scripts/evals start` starts EDOT and Scout for you. If you want to export traces to Phoenix or a shared tracing cluster, configure the eval profiles with:

```bash
node scripts/evals init config
```

See [`@kbn/evals` documentation](../../kbn-evals/README.md) for `TRACING_EXPORTERS` and `TRACING_ES_URL` details.

## Running Evaluations

### Managed Stack

Use `node scripts/evals start` when you want the CLI to start or reuse EDOT and Scout, enable EIS Cloud Connected Mode, and then run the suite:

```bash
node scripts/evals start \
  --suite agent-builder-dashboards \
  --project eis-anthropic-claude-4-5-sonnet \
  --evaluation-connector-id eis-anthropic-claude-4-5-sonnet
```

The Scout Kibana instance is usually available at <http://localhost:5620>, and Elasticsearch at <http://localhost:9220>.

### Run a Single Eval

Filter by Playwright test title with `--grep`:

```bash
node scripts/evals start \
  --suite agent-builder-dashboards \
  --grep "creates dashboards" \
  --project eis-anthropic-claude-4-5-sonnet \
  --evaluation-connector-id eis-anthropic-claude-4-5-sonnet
```

Test titles, one per spec:

- `creates dashboards that follow the layout and composition rules` (`dashboard_creation.spec.ts`)
- `writes no dashboard for requests that must not become one` (`dashboard_routing.spec.ts`)
- `enhances a seeded dashboard in the requested mode` (`dashboard_enhance.spec.ts`)
- `builds dashboards from DISSECT results with controls on mapped fields only` (`dashboard_discover_results.spec.ts`)
- `edits a sectioned dashboard and keeps the rest of the layout` (`dashboard_layout_edit.spec.ts`)
- `edits non-ES|QL panels, controls and sections of a sectioned dashboard` (`dashboard_edit_scenarios.spec.ts`)

After the eval stack is already running, use `run` for faster iteration:

```bash
node scripts/evals run \
  --suite agent-builder-dashboards \
  --grep "writes no dashboard" \
  --project eis-anthropic-claude-4-5-sonnet \
  --evaluation-connector-id eis-anthropic-claude-4-5-sonnet
```

### Repetitions

By default, each dataset example runs once. To run each example multiple times, pass `--repetitions`:

```bash
node scripts/evals start \
  --suite agent-builder-dashboards \
  --grep "creates dashboards" \
  --project eis-anthropic-claude-4-5-sonnet \
  --evaluation-connector-id eis-anthropic-claude-4-5-sonnet \
  --repetitions 3
```

Equivalent environment variable:

```bash
EVAL_REPETITIONS=3 node scripts/evals run \
  --suite agent-builder-dashboards \
  --grep "creates dashboards" \
  --project eis-anthropic-claude-4-5-sonnet \
  --evaluation-connector-id eis-anthropic-claude-4-5-sonnet
```

### Direct Playwright

For lower-level debugging, run Playwright directly:

```bash
EVAL_CONNECTOR_ID=eis-anthropic-claude-4-5-sonnet \
node scripts/playwright test \
  --config x-pack/platform/packages/shared/agent-builder-dashboards/kbn-evals-suite-agent-builder-dashboards/playwright.config.ts \
  evals/dashboards/dashboard_routing.spec.ts \
  --project eis-anthropic-claude-4-5-sonnet \
  --grep "writes no dashboard"
```

Use `--list` to check what Playwright can discover:

```bash
EVAL_CONNECTOR_ID=eis-anthropic-claude-4-5-sonnet \
node scripts/playwright test \
  --config x-pack/platform/packages/shared/agent-builder-dashboards/kbn-evals-suite-agent-builder-dashboards/playwright.config.ts \
  --project eis-anthropic-claude-4-5-sonnet \
  --list
```

## Sample Data

Every spec loads Kibana logs sample data before running:

```ts
await fetch('/api/sample_data/logs', {
  method: 'POST',
  version: '2023-10-31',
});
```

To verify the index exists in the Scout Elasticsearch cluster:

```bash
curl -u elastic:changeme "http://localhost:9220/_cat/indices/kibana_sample_data_logs?v"
curl -u elastic:changeme "http://localhost:9220/kibana_sample_data_logs/_count?pretty"
```

## Stopping the Stack

When you are done:

```bash
node scripts/evals stop
```
