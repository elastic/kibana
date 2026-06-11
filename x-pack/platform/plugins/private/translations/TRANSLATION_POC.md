# LLM-Based Translation PoC — Findings & Architecture Notes

> Working document. Numbers are real, pulled from the Kibana codebase on 2026-06-11.
> Goal: build a case for replacing the current Smartling-based pipeline with an LLM-based approach.

---

## Context

Kibana currently ships in 4 languages: zh-CN, ja-JP, fr-FR, de-DE.
English is the default and is served inline (zero cost, zero network).
The PoC targets Spanish (es) as a new language, scoped to the Discover plugin.

---

## Current Architecture

### How translations work today

- Every translatable string is `i18n.translate('some.dotted.id', { defaultMessage: 'English text' })` in source
- `defaultMessage` is the canonical English string — baked into source, always works as fallback
- ICU Message syntax handles plurals, variables, date/number formatting across all CLDR locales
- At runtime, a single `{locale}.json` blob is fetched once, cached immutably for 365 days in production
- English users never fetch this blob — served inline, zero overhead

### The translation files

- Located in `x-pack/platform/plugins/private/translations/translations/`
- Registered in `x-pack/.i18nrc.json` under `"translations": [...]`
- Discovered at server startup by scanning `.i18nrc.json` files across all packages
- **Size**: zh-CN.json is 6.6 MB raw, ~1–1.5 MB gzipped
- **Scale**: ~56,327 keys across all of Kibana; Discover alone has 248 keys

### Current pipeline (elastic/translations repo)

An external repo (`elastic/translations`) handles the translation workflow:
1. Monitors a Google Sheets release schedule
2. Extracts strings from Kibana source via `node scripts/i18n_extract`
3. Uploads to **Smartling** (professional TMS) — "AI Powered Human Translation" workflow
   - AI generates draft → human translator reviews
   - Translation Memory (TM) gives discounts for repeated strings (90% discount on exact matches)
4. LLM QA pipeline runs on returned translations:
   - Language detection (wrong target language?)
   - ICU/Markdown syntax validation (did `{variables}` survive?)
   - Style guide compliance (PDF rules → LLM check)
   - Semantic similarity via embeddings (suspicious/incomplete translations)
5. Downloads completed files, submits PRs to Kibana

### What Kibana's own CI does

One Buildkite step (`checks/i18n.sh`):
```bash
node scripts/i18n_check --quiet
```
This is a **linter only** — validates `.i18nrc.json` consistency, checks translation files for orphaned/incompatible keys, validates ICU syntax. It does **not** generate or update translations.

### Key architectural issue: singleton intl instance

The i18n engine (`@kbn/i18n`) uses a global singleton — one locale for the whole process. This makes SSR per-user locale impossible: all users on a Kibana instance see the same language. Noted in a code comment in `i18n.ts`.

---

## Problems with the Current Approach

### 1. Translation lag
Smartling turnaround is weeks, not hours. Strings added in one release often don't appear translated until the next. For a fast-moving codebase (~52 PRs/day), this gap is always visible.

### 2. Translator context is invisible
Translators see `"Delete"` with key `xpack.security.management.deleteRole.deleteButtonLabel` and no idea what they're deleting. The `description` field exists in the i18n.translate API but is almost never populated and never enforced. This produces ambiguous translations that are grammatically wrong in context.

### 3. Cost scales with scope
Adding a 5th language means another full Smartling engagement. Adding a 6th means another. The cost isn't marginal — it's proportional to language count times string count.

### 4. Operational complexity
The `elastic/translations` repo is substantial: Vault secrets, Google Sheets integration, Smartling job lifecycle management, multi-step LLM QA pipeline, polling loops. It solves real problems but the complexity is proportional to Smartling being async and human-in-the-loop.

### 5. Silent fallback in separate React roots
Components rendered via `ReactDOM.render()` outside the main app tree (e.g. modals, flyouts) that use `<FormattedMessage>` silently fall back to English if not wrapped in `KibanaRenderContextProvider`. The `i18n.translate()` singleton API is not affected. Kibana has the `toMountPoint` helper to handle this correctly, but it's not enforced.

---

## The PoC: LLM-Based Translation

### Scope
- Plugin: Discover
- Language: Spanish (es), Russian (ru-RU)
- String count: 248 (discover plugin only)
- Approach: Claude translates directly, flags uncertain strings

### Key finding: Discover is assembled from shared packages

Smoke-testing with `ru-RU` revealed that "translate only the Discover plugin" produces a partially-translated UI. The top navigation strings translate correctly, but most of the visible surface area comes from shared packages that have their own i18n keys:

| Visible UI area | Package | Approx. keys |
|---|---|---|
| Field list ("Popular fields", "Available fields", "Search field names") | `kbn-unified-field-list` | ~120 |
| Search bar ("Filter your data using KQL syntax") | `kbn-unified-search` | ~80 |
| Time picker ("Last 15 minutes", "Refresh") | `kbn-unified-search` / `data` | ~60 |
| Results table ("Documents", "Patterns", "Field statistics", "Sort fields") | `kbn-unified-data-table` | ~150 |
| Chart controls ("Auto interval", "No breakdown") | `kbn-expression-xy` / chart packages | ~40 |

**Implication:** A usable Discover translation requires ~6–7 packages, not just the `discover` plugin. The `discover` plugin's 248 keys cover only the chrome (top nav, session management, settings). The real minimum viable scope is approximately **650–700 strings** across these packages.

This does not change the cost model meaningfully — 700 strings at Sonnet rates is still ~$0.90, and at Haiku rates ~$0.07. But the script scope needs to expand from one `DISCOVER_DIR` to a list of directories.

### Measured run: Russian (ru-RU), Discover plugin

Translation was run directly in conversation context (single LLM call, no batching overhead).

| Metric | Value |
|---|---|
| Strings translated | 248 |
| Model | Claude Sonnet 4.6 |
| Wall-clock time | **139.6 s (2 min 20 s)** |
| Tokens consumed | **28,042** |
| Strings flagged for review | 3 (1.2%) |
| Estimated cost at Sonnet 4.6 rates | **~$0.30** |

Token cost breakdown: Sonnet 4.6 charges $3/MTok input and $15/MTok output. The output is dominant here — each translated entry is wrapped in `{"t": "...", "f": false}` JSON, which inflates output token count vs. a raw string. Estimated split: ~9k input ($0.03) + ~19k output ($0.28) = ~$0.31.

> **Note on earlier $0.05 estimate:** That was based on string character length only, ignoring JSON structural overhead per key. The measured figure (~$0.30) is a better baseline.

### Cost projection (updated from measurement)

| Scope | Model | Realtime | Batch API (50% off) |
|---|---|---|---|
| Discover only (248 strings) | Sonnet 4.6 | **~$0.30** *(measured)* | ~$0.15 |
| All of Kibana (56,327 strings) | Sonnet 4.6 | ~$68 | ~$34 |
| All of Kibana (56,327 strings) | Haiku 4.5 | ~$7 | ~$4 |

> Haiku 4.5 output rate is $1.25/MTok vs Sonnet's $15/MTok — 12× cheaper on the dominant cost. Quality evaluation needed before switching for production.

Bootstrap cost (first translation of a new language): one-time.
Incremental cost (only changed strings per run): fractions of a cent per daily delta (~375 strings/day across all Kibana = ~$0.04/day with Haiku).

### String distribution
- **13.9% of strings** contain ICU placeholders (`{variable}`, plurals) — need special handling
- **86.1%** are plain strings — straightforward translation
- Average string length: 16 chars (median: 7 chars — most strings are very short)

### Quality model

| String type | Confidence | Handling |
|---|---|---|
| Short unambiguous ("Save", "Cancel", "No results") | High (~90%) | Auto-approve |
| Strings with ICU variables | Medium | Structural validation (placeholder count check) |
| Ambiguous without context ("Edit", "New") | Lower | Model self-flags |
| Long descriptive / error messages | Medium | Model self-flags if uncertain |

**Flagging mechanism**: model outputs `{ "t": "translation", "f": true, "why": "reason" }` for uncertain strings. Flagged strings go to `es.flagged.json` for human review. Estimated flag rate: 5–15% of strings.

This shifts the human workload from "review everything" to "review a short list of uncertain cases."

### Why LLM quality is competitive for this use case

- Short technical UI strings have constrained vocabulary — less room for nuance errors
- Claude has strong domain knowledge of Kibana (trained on docs, source, blog posts) — Smartling contractors typically don't
- Same model + same prompt = deterministic style across all strings; rotating freelancers produce inconsistency
- Structural errors (broken ICU syntax) are caught by existing `i18n_check` tooling regardless

---

## Architecture Decision: Internal vs. External

### Why `elastic/translations` is external
Smartling is async and human-in-the-loop: jobs take days, require approval flows, need polling. That coordination complexity genuinely doesn't belong in Kibana's CI. External was the right call for that workflow.

### Why external stops making sense with LLMs
An LLM call takes seconds, not days. There's no human approval loop, no Smartling job lifecycle. The complexity that justified a separate repo disappears. Keeping it external now means:
- Two repos to coordinate when i18n infrastructure changes
- Translation lag between code landing and translation updating
- Unnecessary operational overhead

**Recommendation: bring the logic into Kibana.**

---

## Proposed Architecture

### Trigger: daily scheduled job, not per-merge

**Why not per-merge:**
- 28% of the ~52 daily Kibana merges touch i18n strings = ~15 translation triggers/day
- 15 automated commits to translation files per day is noisy
- Concurrent runs can produce conflicts in the same JSON file

**Why daily batch:**
- One clean PR per day with all accumulated translation changes
- Translations lag by at most 24 hours — acceptable for UI strings
- Easy to pause before release freeze
- No race conditions

### The diff is the translation memory

The committed `es.json` IS the translation memory. No separate database needed:
1. Extract all current `defaultMessage` strings from source
2. Diff against committed `es.json`
3. Translate only: new keys + keys whose `defaultMessage` changed
4. Remove: keys that no longer exist in source
5. Merge result back into `es.json`

### Real-world volume (last 30 days of Kibana main)

- 1,565 PRs merged in 30 days (~52/day)
- 28% touched i18n strings (~15/day)
- Average 25 strings changed per such PR
- Daily delta to translate: ~375 strings/day across all of Kibana
- **Cost per daily run: ~$0.06** (all languages combined)
- **Monthly cost: ~$1.80**

### Registration (already done in PoC branch)

1. `es.json` lives at: `x-pack/platform/plugins/private/translations/translations/es.json`
2. Registered in `x-pack/.i18nrc.json` under `"translations"`
3. Enabled at runtime via `i18n.locale: 'es'` in `kibana.dev.yml`
4. Core auto-discovers and merges it at startup — no other changes needed

### What the script does (`scripts/generate_discover_es_translation.mjs`)

Current PoC script (248 Discover strings):
- Extracts `defaultMessage` values from Discover source via regex
- Translates in batches of 100 via Claude Sonnet 4.6
- Preserves ICU placeholders, product names, technical terms
- Model self-flags uncertain strings → written to `es.flagged.json`
- Outputs `es.json` in correct format

Missing for production (to add):
- Diff against existing `es.json` (only translate delta)
- Use Kibana's existing AST-based extractor (`scripts/i18n_extract`) instead of regex
- Handle all plugins, not just Discover

### Buildkite pipeline (implemented)

Three files modeled on `esql_generate_function_metadata` pattern:

- `.buildkite/pipeline-resource-definitions/kibana-i18n-es-translations.yml` — registers pipeline, defines schedule
- `.buildkite/pipelines/i18n_generate_es_translations.yml` — pipeline YAML
- `.buildkite/scripts/steps/i18n_generate_es_translations.sh` — bootstrap → translate → diff → open PR via kibanamachine

**Schedule:** `0 6 * * 0` — Sunday 6am UTC, 24h before Monday serverless QA promotion.

**One manual step required:** `ANTHROPIC_API_KEY` must be added as a secret in Buildkite pipeline settings by a kibana-operations member. Not stored in YAML.

---

## Business Case

### Cost
| | Current (Smartling) | Proposed (LLM) |
|---|---|---|
| Per-language bootstrap | Hundreds of dollars | ~$7 one-time |
| Ongoing per release | Hundreds of dollars | ~$1.80/month total |
| Adding a new language | Full new engagement | Same script, new locale flag |

### Speed
- Smartling turnaround: weeks
- LLM approach: hours (daily batch) or minutes (on-demand)
- Strings ship translated in the same release they were written, not the next one

### Coverage
Currently 4 languages for a global product. Marginal cost of adding Spanish, Portuguese, Korean, Arabic, Hindi is near-zero with LLM approach. Same pipeline, same script, different `--locale` flag. Elastic's user base is global — 4 languages is undershooting.

### Maintenance burden
- Current: `elastic/translations` repo with Vault secrets, Google Sheets, Smartling API, multi-step LLM QA, polling infrastructure
- Proposed: ~200-line script + one Buildkite step + daily schedule

### Risk
- Wrong translation is less bad than no translation (English fallback always works)
- `i18n_check` already catches structural/ICU errors regardless of translation source
- Flagging mechanism means uncertain strings get human review — not zero oversight

---

## Open Questions

- Should we use `scripts/i18n_extract` (existing AST extractor) instead of regex for production?
- Who owns the flagged strings review process?
- What's the release freeze policy for translation updates?
- Should this extend to all plugins immediately or roll out plugin-by-plugin?
- Is Haiku 4.5 quality good enough for most strings? (Would cut costs by ~70%)

---

## PoC Status

- [x] Branch created: `poc/spanish-translations`
- [x] `es.json` registered in `x-pack/.i18nrc.json`
- [x] `kibana.dev.yml` updated with `es` locale option
- [x] Translation script written: `scripts/generate_discover_es_translation.mjs`
- [x] Unit tests written and passing (20/20) — `src/dev/i18n_tools/es_translation_utils.test.ts`
- [x] Run translation for Russian (`ru`) — 248 strings, 3 flagged for review
- [ ] Review quality of Russian output (native speaker: Paulina)
- [ ] Smoke test in Kibana UI (switch locale to `ru-RU` in kibana.dev.yml, restart, navigate Discover)
- [ ] Run script against Discover for Spanish (`es`) — needs API key
- [x] Buildkite pipeline created (Sunday 6am UTC, 24h before QA promotion)
- [x] Diff logic added — only translates new/changed strings, removes deleted ones
- [ ] Add `ANTHROPIC_API_KEY` secret to Buildkite pipeline (ops team)
