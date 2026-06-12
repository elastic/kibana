# Investigation Harness — Implementation Spec

Root cause analysis for Significant Events. A multi-step managed workflow that runs
automatically after each new Significant Event promotion, performing hypothesis-driven
investigation via a fork-join agent pipeline. Results enrich the Discovery document.
Behind a feature flag; not installed by default.

---

## Architecture

```
Significant Event promoted
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Step 1: Context Agent  (Sonnet)                        │
│  Reads memory + sigevent → generates up to 5 hypotheses │
│  Each hypothesis has a prior confidence score           │
└─────────────────┬───────────────────────────────────────┘
                  │  hypotheses[0..N-1]
        ┌─────────┴────────────────────────────────────────────┐
        │              parallel (up to 5 branches)              │
        │                                                       │
        │  [per branch]                                         │
        │  ai.agent — gather (Haiku)                           │
        │  Collects raw evidence: ES|QL, memory, KIs, MCP      │
        │      ↓                                                │
        │  ai.agent — review (Haiku)                           │
        │  Judges evidence quality, verdicts the hypothesis     │
        │      ↓                                                │
        │  ◇ decision: forward | discard                       │
        │    discard → branch produces discard record only      │
        │    forward → branch produces full gather+review result│
        │                                                       │
        └──────────────────────────┬────────────────────────────┘
                                   │  merge
                                   ▼
               ┌─────────────────────────────────────┐
               │  Step 3: Synthesis  (Sonnet)         │
               │  Receives forwarded results only      │
               │  Ranks, produces RCA + remediation    │
               │  Records discarded hypotheses         │
               │  Writes memory + write-back           │
               └─────────────────────────────────────┘
```

---

## 1. Feature Flag

**Constant name:** `OBSERVABILITY_STREAMS_ENABLE_INVESTIGATION`
**UI key:** `'observability:streamsEnableInvestigation'`
**Default:** `false`

Add to:
- `src/platform/packages/shared/kbn-management/settings/setting_ids/index.ts`
- `x-pack/platform/plugins/shared/streams/server/feature_flags.ts` — same pattern as
  `OBSERVABILITY_STREAMS_ENABLE_MEMORY`; wire an `onInvestigationSettingChanged` callback
  to lazily register/unregister the agents and install/uninstall the workflow.

---

## 2. New Files

```
kbn-workflows/managed/definitions/streams_investigation/
  investigation_workflow.ts               — managed workflow definition + ID constant

kbn-streams-schema/src/sig_events/
  investigations/
    index.ts
    schema.ts                             — all step I/O types (see §4)

streams plugin server/
  lib/sig_events/investigations/
    investigation_service.ts              — trigger workflow after verdict promotion
  agent_builder/skills/investigation/
    investigation_context_skill.ts        — context + hypothesis generation prompt
    hypothesis_gather_skill.ts            — evidence gathering prompt (no verdict)
    hypothesis_review_skill.ts            — evidence review + forward/discard gate
    investigation_synthesis_skill.ts      — rank + write-back prompt
  agent_builder/register.ts              — register 4 new agents (gated on flag)
  lib/memory/install_managed_workflows.ts — add investigation workflow to install list
```

---

## 3. Model Assignments

| Step | Agent ID | Model | Rationale |
|------|----------|-------|-----------|
| Build context | `sigevents.investigation.context` | **Sonnet** | Memory retrieval, reasoning, hypothesis quality |
| Gather evidence ×5 | `sigevents.investigation.gather` | **Haiku** | Mechanical tool-calling: ES\|QL, memory lookups, KI search |
| Review evidence ×5 | `sigevents.investigation.review` | **Haiku** | Structured judgment against collected evidence — still in the hot path |
| Synthesis | `sigevents.investigation.synthesis` | **Sonnet** | Integrates forwarded results, writes memory, final RCA — quality matters |

The parallel branches (gather + review × up to 5) are where tokens concentrate. Both
steps use Haiku; the structured `schema:` output keeps quality adequate — the Sonnet
synthesis step is the reasoning layer for the final answer.

---

## 4. Schemas

All types live in `kbn-streams-schema/src/sig_events/investigations/schema.ts`.
The workflow references these in its `schema:` blocks to enforce structured output.

### 4.1 Workflow Input

Populated from the promoted Discovery at trigger time.

```typescript
const investigationInputSchema = z.object({
  event_id: z.string(),
  discovery_id: z.string(),
  discovery_slug: z.string(),
  title: z.string(),
  summary: z.string(),
  // root_cause and impact from the Discovery Agent — the investigation
  // should try to confirm, deepen, or refute these.
  root_cause: z.string(),
  impact: z.string(),
  stream_names: z.array(z.string()),
  // cause_kis and evidences carry the signals the Discovery Agent already
  // collected. The Investigation Context Agent reads these and memory
  // before generating hypotheses, so it doesn't re-derive what's known.
  cause_kis: z.array(causeKiSchema),
  evidences: z.array(evidenceSchema),
});

export type InvestigationInput = z.infer<typeof investigationInputSchema>;
```

---

### 4.2 Step 1 — Context Agent Output

The context agent reads memory and the sigevent, then proposes hypotheses. The prompt
instructs it to use only as many hypotheses as are genuinely distinct and worth
investigating — the cap is 5, not a target.

```typescript
const hypothesisProposalSchema = z.object({
  id: z.string(),
  // Short stable slug used to correlate results across steps.
  // Lowercase, hyphenated. Examples: "dep-rollout", "upstream-saturation".

  statement: z.string(),
  // One falsifiable sentence: what component failed and why.
  // Bad:  "There might be a database problem."
  // Good: "Checkout latency spiked because a bad deploy to payments-svc
  //         at 14:23 introduced a blocking DB query on every request."

  prior_confidence: z.number().min(0).max(1),
  // Agent's prior belief that this hypothesis is the root cause,
  // based solely on the sigevent context and memory — before gathering
  // any additional evidence. 0 = very unlikely, 1 = near-certain.
  // This is intentionally subjective; the evidence step will update it.

  suggested_queries: z.array(z.string()).max(4),
  // Concrete leads for the gather agent: ES|QL fragments, service names
  // to look up in memory, KI search terms, MCP calls to try.
  // The gather agent is not bound to these but should start here.
});

const contextOutputSchema = z.object({
  context_summary: z.string(),
  // What the agent understood about the event: affected services,
  // timeline, signals already in evidence, relevant memory pages consulted.

  memory_context: z.string(),
  // Summary of what was retrieved from memory relevant to this event:
  // prior incidents, known failure modes, service topology context.
  // "Nothing relevant found in memory." is a valid value.

  known_gaps: z.array(z.string()),
  // Knowledge the agent wished it had but couldn't find:
  // missing connectors, unknown services, no memory pages for a service.
  // Carried through to the final result so gaps surface to the user.

  hypotheses: z.array(hypothesisProposalSchema).min(1).max(5),
  // Ordered by prior_confidence descending. At least 1 is required;
  // the agent should generate fewer rather than pad with weak ones.
});

export type ContextOutput = z.infer<typeof contextOutputSchema>;
```

---

### 4.3a Step 2a — Gather Agent Output (per branch)

The gather agent's only job is to collect raw evidence. It does not render a verdict —
that belongs to the review step. The prompt should instruct it to be thorough and
honest: record what it tried, what it found, and what it couldn't reach.

```typescript
const evidenceItemSchema = z.object({
  source: z.enum(['esql', 'memory', 'ki', 'mcp', 'none']),
  description: z.string(),
  // What was queried or read, and what was found (or not found).
  // Be specific: include query shape, row counts, or the exact absence message.

  relevance: z.enum(['supporting', 'refuting', 'neutral', 'unreachable']),
  // supporting   — data is consistent with the hypothesis being true.
  // refuting     — data contradicts the hypothesis.
  // neutral      — context that doesn't confirm or deny.
  // unreachable  — the source was attempted but access was blocked.
  //                Include a description of the specific blocker.
});

const gatherOutputSchema = z.object({
  hypothesis_id: z.string(),
  // Must match the id from hypothesisProposalSchema.

  evidence: z.array(evidenceItemSchema).max(12),
  // Everything attempted, including failed lookups (mark as 'unreachable').
  // Do not omit refuting evidence or dead ends — the review agent needs them.

  gaps_found: z.array(z.string()),
  // Specific access blockers: "no GitHub connector", "ES|QL returned no rows
  // for stream foo.bar — stream may not exist in this space", etc.
  // Populated whether or not the overall gather was productive.

  gather_summary: z.string(),
  // 2–4 sentence summary of what was tried and what the evidence shows so far.
  // Written for the review agent, not the end user.
});

export type GatherOutput = z.infer<typeof gatherOutputSchema>;
```

---

### 4.3b Step 2b — Review Agent Output (per branch)

The review agent receives the hypothesis proposal and the gather output. It verdicts the
hypothesis and decides whether the result is worth forwarding to synthesis. A discarded
hypothesis does not appear in the synthesis context at all — the synthesis agent only
sees forwarded results. Discarded entries are preserved in the final
`InvestigationResult.discarded_hypotheses` field for auditability.

```typescript
const reviewOutputSchema = z.object({
  hypothesis_id: z.string(),
  // Must match the id from hypothesisProposalSchema.

  decision: z.enum(['forward', 'discard']),
  // forward — evidence is substantive enough to include in synthesis ranking.
  // discard — cut this hypothesis; do not pass to synthesis.
  //
  // Discard when ALL of the following are true:
  //   (a) no evidence source returned useful data (all 'unreachable' or 'none'), OR
  //       the evidence so clearly refutes the hypothesis that ranking it adds no signal;
  //   (b) including it would not help the synthesis agent understand the event better.
  // Do NOT discard a clearly-refuted hypothesis if the refutation itself is informative
  // (e.g. "we checked and it was NOT the deploy" is worth surfacing).

  discard_reason: z.string().optional(),
  // Required when decision === 'discard'. One sentence explaining the cut.
  // Examples:
  //   "All three data sources were unreachable — no GitHub connector, ES|QL
  //    returned zero rows, memory has no pages for this service."
  //   "Evidence strongly and unambiguously refutes the hypothesis with nothing
  //    new to add beyond what the context agent already knew."

  verdict: z.enum(['supported', 'refuted', 'inconclusive', 'out_of_reach']),
  // supported     — evidence clearly confirms the hypothesis.
  // refuted       — evidence clearly contradicts it.
  // inconclusive  — evidence gathered but neither confirms nor denies.
  // out_of_reach  — the decisive signal exists but was behind an access boundary.
  //                 Use ONLY when a specific blocker prevented reaching the signal;
  //                 not as a fallback when evidence is merely weak or sparse.

  posterior_confidence: z.number().min(0).max(1),
  // Updated belief in the hypothesis being the root cause, after reviewing
  // the gathered evidence. Should reflect both what was found and what wasn't:
  //   refuted with strong evidence → near 0
  //   supported with strong evidence → near 1
  //   out_of_reach (nothing learned) → match the prior_confidence from the proposal
  //   inconclusive (partial data) → somewhere in between

  reasoning: z.string(),
  // How the evidence led to the verdict and the forward/discard decision.
  // Must name the specific blocker when verdict is 'out_of_reach'.
  // Should make posterior_confidence feel calibrated to a reader who sees both.
});

export type ReviewOutput = z.infer<typeof reviewOutputSchema>;
```

---

### 4.4 Step 3 — Synthesis Agent Output

Receives the context output and **only the forwarded** branch results (gather + review
pairs where `decision === 'forward'`). Discarded entries are excluded from the synthesis
context entirely. The synthesis agent records them in the output for auditability.

```typescript
const remediationOptionSchema = z.object({
  rank: z.number().int().min(1),

  action: z.string(),
  // Plain-text description of the remediation step. No autonomous execution
  // in v1 — this is a textual recommendation only.

  rationale: z.string(),
  // Why this action addresses the root cause: connects the evidence to
  // the proposed fix. Must reference specific findings, not generic advice.

  risk_level: z.enum(['low', 'medium', 'high']),
  // low    — read-only, dry-run, or clearly non-destructive (e.g. view logs)
  // medium — restarts, config changes with rollback path
  // high   — rollbacks, scaling operations, data mutations

  prerequisites: z.array(z.string()).optional(),
  // Anything that must be true or set up before this action can run.
  // Examples: "Requires GitHub connector", "Needs prod write access".
});

const rankedHypothesisSchema = z.object({
  rank: z.number().int().min(1),
  hypothesis_id: z.string(),
  statement: z.string(),
  // Copied from the proposal; may be refined if evidence warranted it.

  verdict: z.enum(['supported', 'refuted', 'inconclusive', 'out_of_reach']),
  prior_confidence: z.number().min(0).max(1),    // from context agent proposal
  posterior_confidence: z.number().min(0).max(1), // from review agent
  evidence_summary: z.string(),
  // One-paragraph digest of what was found. Surfaced in the UI.
});

const discardedHypothesisSchema = z.object({
  hypothesis_id: z.string(),
  statement: z.string(),
  discard_reason: z.string(),
  // Copied from the review agent's discard_reason.
});

const investigationResultSchema = z.object({
  root_cause: z.string(),
  // The top-supported hypothesis statement, refined if evidence warranted.
  // Set to "Undetermined — see gaps_found" if no hypothesis was supported
  // or all forwarded hypotheses were out_of_reach.

  confidence: z.number().min(0).max(1),
  // The synthesis agent's overall confidence in the root_cause field.
  // Reflects both evidence strength and completeness (gaps reduce this).
  // Distinct from any individual hypothesis's posterior_confidence.

  impact: z.string(),
  // Refined impact assessment. May confirm, correct, or expand the
  // Discovery Agent's original impact field.

  ranked_hypotheses: z.array(rankedHypothesisSchema),
  // Forwarded hypotheses only, ranked best-to-worst by
  // posterior_confidence weighted by verdict
  // (supported > inconclusive > out_of_reach > refuted).

  discarded_hypotheses: z.array(discardedHypothesisSchema),
  // Hypotheses the review agent discarded. Not ranked; recorded for audit.
  // Empty when all hypotheses were forwarded.

  remediation_options: z.array(remediationOptionSchema),
  // Only present if root_cause is not "Undetermined". Empty array otherwise.
  // Should be empty rather than generic advice when evidence is insufficient.

  gaps_found: z.array(z.string()),
  // Union of all gather-step gaps_found + context-level known_gaps.
  // Surfaced in the UI so users know what to connect or provide access to.

  investigation_complete: z.boolean(),
  // false when all hypotheses were either discarded or out_of_reach — signals
  // that access gaps blocked the full investigation, not that the agent gave up.

  memory_pages_written: z.array(z.string()),
  // page_name values written to memory in this run. For audit / debugging.
});

export type InvestigationResult = z.infer<typeof investigationResultSchema>;
```

---

## 5. Storage

**No new data stream.** Investigation results enrich the existing Discovery document.

Extend `discoverySchema` in `kbn-streams-schema` with an optional `investigation` field:

```typescript
// Added to discoverySchema — absent until investigation workflow completes
investigation: z.object({
  completed_at: z.iso.datetime(),
  workflow_execution_id: z.string(),
  ...investigationResultSchema.shape,
}).optional(),
```

Extend `discoveriesMappings` in
`streams/server/lib/sig_events/discoveries/data_stream.ts` with matching
`investigation.*` keyword/object/float mappings.

Write-back uses the existing `DiscoveryClient.bulkCreate()` append pattern — a new
document with the same `discovery_id` + `discovery_slug` supersedes the prior one via
`latest_source_query`. The synthesis agent calls a small internal route:

```
POST /internal/streams/sig_events/discoveries/{discovery_id}/investigation
Body: InvestigationResult
```

---

## 6. Workflow YAML

Each parallel branch runs two sequential agents: gather then review. The review
agent's `decision` field acts as the gate — the synthesis prompt filters to
`decision === 'forward'` entries; discarded entries populate `discarded_hypotheses`.

```yaml
version: "1"
name: Investigation
description: >
  Root cause analysis for a promoted Significant Event. Runs a context agent to
  generate hypotheses, then for each hypothesis: gathers evidence (Haiku) and
  reviews it (Haiku). Reviewed results are merged and synthesised (Sonnet) back
  to the Discovery document and memory.
enabled: true
settings:
  timeout: "45m"
  concurrency:
    key: "streams-sigevents-investigation-{{ inputs.discovery_id }}"
    strategy: replace   # new run for the same discovery cancels the prior one
    max: 1
tags: [observability, streams, sigevents, investigation]

triggers:
  - type: manual   # also triggered programmatically via workflow execution API

steps:

  # ── Step 1: Context ──────────────────────────────────────────────────────────
  - name: build_context
    type: ai.agent
    agent-id: sigevents.investigation.context
    connector-id: ".anthropic-claude-4.6-sonnet-chat_completion"
    create-conversation: true
    with:
      timeout: 600s
      message: |
        Investigate this significant event and propose root cause hypotheses.
        Generate as many hypotheses as are genuinely distinct and worth investigating —
        up to 5 maximum. Do not pad to 5; fewer strong hypotheses are better than many
        weak ones. Order them by your prior confidence, highest first.

        Event: {{ inputs | json }}
      schema:
        type: object
        properties:
          context_summary:   { type: string }
          memory_context:    { type: string }
          known_gaps:        { type: array, items: { type: string } }
          hypotheses:
            type: array
            minItems: 1
            maxItems: 5
            items:
              type: object
              properties:
                id:                 { type: string }
                statement:          { type: string }
                prior_confidence:   { type: number, minimum: 0, maximum: 1 }
                suggested_queries:  { type: array, items: { type: string } }
              required: [id, statement, prior_confidence, suggested_queries]
        required: [context_summary, memory_context, known_gaps, hypotheses]
    on-failure:
      continue: false

  # ── Step 2: Parallel gather + review per hypothesis (Haiku × 2 per branch) ──
  - name: investigate_hypotheses
    type: parallel
    branches:
      - name: hypothesis_0
        steps:
          - name: gather
            type: ai.agent
            if: "{{ steps.build_context.output.hypotheses | size >= 1 }}"
            agent-id: sigevents.investigation.gather
            connector-id: ".anthropic-claude-4.5-haiku-chat_completion"
            with:
              timeout: 360s
              message: |
                Collect all available evidence for this hypothesis. Do not render a
                verdict — that is the next step's job. Record everything you tried,
                including failed lookups and access blockers. Be thorough and honest.

                Hypothesis: {{ steps.build_context.output.hypotheses[0] | json }}
                Event context: {{ steps.build_context.output.context_summary }}
                Streams: {{ inputs.stream_names | json }}
              schema:
                # → gatherOutputSchema (see §4.3a)

          - name: review
            type: ai.agent
            if: "{{ steps.build_context.output.hypotheses | size >= 1 }}"
            agent-id: sigevents.investigation.review
            connector-id: ".anthropic-claude-4.5-haiku-chat_completion"
            with:
              timeout: 180s
              message: |
                Review the gathered evidence and verdict the hypothesis.
                Decide whether to forward it to synthesis or discard it.
                Discard only when the evidence is so thin or so clearly refuted
                that including it would add no signal to the final ranking.
                A clearly-refuted hypothesis is still worth forwarding if the
                refutation itself is informative.

                Hypothesis: {{ steps.build_context.output.hypotheses[0] | json }}
                Gathered evidence: {{ steps.hypothesis_0.gather.output | json }}
              schema:
                # → reviewOutputSchema (see §4.3b)

      - name: hypothesis_1
        steps:
          - name: gather
            type: ai.agent
            if: "{{ steps.build_context.output.hypotheses | size >= 2 }}"
            agent-id: sigevents.investigation.gather
            connector-id: ".anthropic-claude-4.5-haiku-chat_completion"
            with:
              timeout: 360s
              message: |
                Collect all available evidence for this hypothesis. Do not render a
                verdict — that is the next step's job. Record everything you tried,
                including failed lookups and access blockers. Be thorough and honest.

                Hypothesis: {{ steps.build_context.output.hypotheses[1] | json }}
                Event context: {{ steps.build_context.output.context_summary }}
                Streams: {{ inputs.stream_names | json }}
              schema:
                # → gatherOutputSchema

          - name: review
            type: ai.agent
            if: "{{ steps.build_context.output.hypotheses | size >= 2 }}"
            agent-id: sigevents.investigation.review
            connector-id: ".anthropic-claude-4.5-haiku-chat_completion"
            with:
              timeout: 180s
              message: |
                Review the gathered evidence and verdict the hypothesis.
                Decide whether to forward it to synthesis or discard it.
                Discard only when the evidence is so thin or so clearly refuted
                that including it would add no signal to the final ranking.
                A clearly-refuted hypothesis is still worth forwarding if the
                refutation itself is informative.

                Hypothesis: {{ steps.build_context.output.hypotheses[1] | json }}
                Gathered evidence: {{ steps.hypothesis_1.gather.output | json }}
              schema:
                # → reviewOutputSchema

      - name: hypothesis_2
        steps:
          - name: gather
            type: ai.agent
            if: "{{ steps.build_context.output.hypotheses | size >= 3 }}"
            agent-id: sigevents.investigation.gather
            connector-id: ".anthropic-claude-4.5-haiku-chat_completion"
            with:
              timeout: 360s
              message: |
                Collect all available evidence for this hypothesis. Do not render a
                verdict — that is the next step's job. Record everything you tried,
                including failed lookups and access blockers. Be thorough and honest.

                Hypothesis: {{ steps.build_context.output.hypotheses[2] | json }}
                Event context: {{ steps.build_context.output.context_summary }}
                Streams: {{ inputs.stream_names | json }}
              schema:
                # → gatherOutputSchema

          - name: review
            type: ai.agent
            if: "{{ steps.build_context.output.hypotheses | size >= 3 }}"
            agent-id: sigevents.investigation.review
            connector-id: ".anthropic-claude-4.5-haiku-chat_completion"
            with:
              timeout: 180s
              message: |
                Review the gathered evidence and verdict the hypothesis.
                Decide whether to forward it to synthesis or discard it.
                Discard only when the evidence is so thin or so clearly refuted
                that including it would add no signal to the final ranking.
                A clearly-refuted hypothesis is still worth forwarding if the
                refutation itself is informative.

                Hypothesis: {{ steps.build_context.output.hypotheses[2] | json }}
                Gathered evidence: {{ steps.hypothesis_2.gather.output | json }}
              schema:
                # → reviewOutputSchema

      - name: hypothesis_3
        steps:
          - name: gather
            type: ai.agent
            if: "{{ steps.build_context.output.hypotheses | size >= 4 }}"
            agent-id: sigevents.investigation.gather
            connector-id: ".anthropic-claude-4.5-haiku-chat_completion"
            with:
              timeout: 360s
              message: |
                Collect all available evidence for this hypothesis. Do not render a
                verdict — that is the next step's job. Record everything you tried,
                including failed lookups and access blockers. Be thorough and honest.

                Hypothesis: {{ steps.build_context.output.hypotheses[3] | json }}
                Event context: {{ steps.build_context.output.context_summary }}
                Streams: {{ inputs.stream_names | json }}
              schema:
                # → gatherOutputSchema

          - name: review
            type: ai.agent
            if: "{{ steps.build_context.output.hypotheses | size >= 4 }}"
            agent-id: sigevents.investigation.review
            connector-id: ".anthropic-claude-4.5-haiku-chat_completion"
            with:
              timeout: 180s
              message: |
                Review the gathered evidence and verdict the hypothesis.
                Decide whether to forward it to synthesis or discard it.
                Discard only when the evidence is so thin or so clearly refuted
                that including it would add no signal to the final ranking.
                A clearly-refuted hypothesis is still worth forwarding if the
                refutation itself is informative.

                Hypothesis: {{ steps.build_context.output.hypotheses[3] | json }}
                Gathered evidence: {{ steps.hypothesis_3.gather.output | json }}
              schema:
                # → reviewOutputSchema

      - name: hypothesis_4
        steps:
          - name: gather
            type: ai.agent
            if: "{{ steps.build_context.output.hypotheses | size >= 5 }}"
            agent-id: sigevents.investigation.gather
            connector-id: ".anthropic-claude-4.5-haiku-chat_completion"
            with:
              timeout: 360s
              message: |
                Collect all available evidence for this hypothesis. Do not render a
                verdict — that is the next step's job. Record everything you tried,
                including failed lookups and access blockers. Be thorough and honest.

                Hypothesis: {{ steps.build_context.output.hypotheses[4] | json }}
                Event context: {{ steps.build_context.output.context_summary }}
                Streams: {{ inputs.stream_names | json }}
              schema:
                # → gatherOutputSchema

          - name: review
            type: ai.agent
            if: "{{ steps.build_context.output.hypotheses | size >= 5 }}"
            agent-id: sigevents.investigation.review
            connector-id: ".anthropic-claude-4.5-haiku-chat_completion"
            with:
              timeout: 180s
              message: |
                Review the gathered evidence and verdict the hypothesis.
                Decide whether to forward it to synthesis or discard it.
                Discard only when the evidence is so thin or so clearly refuted
                that including it would add no signal to the final ranking.
                A clearly-refuted hypothesis is still worth forwarding if the
                refutation itself is informative.

                Hypothesis: {{ steps.build_context.output.hypotheses[4] | json }}
                Gathered evidence: {{ steps.hypothesis_4.gather.output | json }}
              schema:
                # → reviewOutputSchema

  - name: collect_results
    type: merge
    sources:
      - hypothesis_0
      - hypothesis_1
      - hypothesis_2
      - hypothesis_3
      - hypothesis_4

  # ── Step 3: Synthesis ─────────────────────────────────────────────────────────
  - name: synthesize
    type: ai.agent
    agent-id: sigevents.investigation.synthesis
    connector-id: ".anthropic-claude-4.6-sonnet-chat_completion"
    create-conversation: true
    with:
      timeout: 600s
      message: |
        Synthesise the investigation results.
        The branch results contain both gather and review outputs per hypothesis.
        For ranking and remediation, use ONLY entries where review.decision === 'forward'.
        Record entries where review.decision === 'discard' in discarded_hypotheses
        (copy their hypothesis_id, statement, and discard_reason — do not rank them).
        Produce a root cause statement only if at least one forwarded hypothesis was
        'supported' — otherwise use "Undetermined". Only propose remediation options
        grounded in the evidence; leave the array empty rather than offering generic advice.
        Write lessons learned to memory. Set investigation_complete to false if all
        forwarded hypotheses were out_of_reach or no hypotheses were forwarded at all.

        Context: {{ steps.build_context.output | json }}
        Branch results: {{ steps.collect_results.output | json }}
        Event: event_id={{ inputs.event_id }}, discovery_id={{ inputs.discovery_id }}
      schema:
        # → investigationResultSchema (see §4.4)
    on-failure:
      continue: false

  # ── Step 4: Write-back ────────────────────────────────────────────────────────
  - name: write_back
    type: http
    with:
      url: "{{ kibana.internal_url }}/internal/streams/sig_events/discoveries/{{ inputs.discovery_id }}/investigation"
      method: POST
      body: "{{ steps.synthesize.output | json }}"
    on-failure:
      continue: true   # write-back failure doesn't invalidate the investigation
```

---

## 7. Agent Registration

Four agents in `register.ts`, all gated on `OBSERVABILITY_STREAMS_ENABLE_INVESTIGATION`:

```typescript
// Context agent — Sonnet, memory read access
agentBuilder.agents.register({
  id: 'sigevents.investigation.context',
  name: 'Investigation Context',
  description:
    'Reads memory and the sigevent to understand what happened, then proposes ' +
    'root cause hypotheses with prior confidence scores.',
  configuration: {
    skill_ids: [
      'significant-events-memory',              // memory_search, memory_read, memory_list
      'significant-events-investigation-context',
    ],
    tools: [],
  },
});

// Gather agent — Haiku, evidence collection, no verdict
agentBuilder.agents.register({
  id: 'sigevents.investigation.gather',
  name: 'Hypothesis Evidence Gatherer',
  description:
    'Collects raw evidence for a single hypothesis via ES|QL, memory, KIs, and MCP ' +
    'tools. Does not render a verdict — records what was found and what was blocked.',
  configuration: {
    skill_ids: ['significant-events-investigation-gather'],
    tools: [],
    // Gets: esql_query, memory_search, memory_read, sml_search + attached MCP tools
  },
});

// Review agent — Haiku, evidence judgment + discard gate
agentBuilder.agents.register({
  id: 'sigevents.investigation.review',
  name: 'Hypothesis Evidence Reviewer',
  description:
    'Reviews gathered evidence for a single hypothesis. Verdicts it and decides ' +
    'whether to forward to synthesis or discard as uninformative.',
  configuration: {
    skill_ids: ['significant-events-investigation-review'],
    tools: [],
    // Read-only: no tool calls needed — works from gather output in context
  },
});

// Synthesis agent — Sonnet, memory write access
agentBuilder.agents.register({
  id: 'sigevents.investigation.synthesis',
  name: 'Investigation Synthesis',
  description:
    'Ranks forwarded hypotheses, produces the final root cause and remediation options, ' +
    'records discarded hypotheses, writes lessons to memory, returns InvestigationResult.',
  configuration: {
    skill_ids: [
      'significant-events-memory',              // memory_write, memory_patch too
      'significant-events-investigation-synthesis',
    ],
    tools: [],
  },
});
```

---

## 8. Trigger

After verdict promotion, fire the workflow from `InvestigationService`:

```typescript
// server/lib/sig_events/investigations/investigation_service.ts
export class InvestigationService {
  async triggerForEvent({
    discovery,
    sigEvent,
    workflowsExtensions,
    space,
  }: TriggerOptions): Promise<void> {
    await workflowsExtensions.execute({
      workflowId: STREAMS_INVESTIGATION_WORKFLOW_ID,
      spaceId: space,
      inputs: {
        event_id: sigEvent.event_id,
        discovery_id: discovery.discovery_id,
        discovery_slug: discovery.discovery_slug,
        title: discovery.title,
        summary: discovery.summary,
        root_cause: discovery.root_cause,
        impact: discovery.impact,
        stream_names: discovery.stream_names,
        cause_kis: discovery.cause_kis ?? [],
        evidences: discovery.evidences ?? [],
      } satisfies InvestigationInput,
    });
  }
}
```

Call `investigationService.triggerForEvent(...)` in the verdict/sigevent creation
path, gated on the feature flag. The workflow's `replace` concurrency strategy handles
rapid re-promotions of the same discovery automatically.

---

## 9. Out of Scope (v1)

- **Autonomous remediation** — `remediation_options` are textual only; no execution
- **Kibana Cases integration** — sigevent enrichment only; case lifecycle is later
- **Behind-VPN probe** — `out_of_reach` surfaces the gap; the probe is a future workstream
- **Triggering from chat without a sigevent** — agents are callable manually, but no dedicated UX
- **UI changes** — `investigation` fields are new data; surfacing them is a follow-on PR
- **Evals** — tracked separately; the investigation workflow is the thing to evaluate against

---

## 10. Implementation Order

1. **Schema** (`kbn-streams-schema` types + Discovery storage mappings) — zero runtime risk, unblocks all other steps
2. **Feature flag** — trivial; enables conditional install downstream
3. **Workflow definition** + managed workflow install — gives a runnable skeleton
4. **Skills + agent registration** — the actual reasoning layer (4 agents: context, gather, review, synthesis)
5. **Write-back route** (`POST /internal/.../investigation`) — closes the data loop
6. **Trigger hookup** in verdict/sigevent creation path — wires everything together
