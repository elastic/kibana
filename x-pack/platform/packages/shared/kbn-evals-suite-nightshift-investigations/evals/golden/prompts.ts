/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Prompt text and schema descriptions ported from Deductive Phase C, commit 3037d27410.

import { z } from '@kbn/zod/v4';

export const INVESTIGATION_RUBRIC =
  '## Reward Function (1-5 scale, aligned with Overall Helpfulness)\n\nScore the agent\'s response against the reference mechanism using this reward function:\n\n**5 — Found the root cause.** The response pinpoints the exact root cause mechanism matching or supersetting the reference, with supporting evidence (timing, logs, config, metrics). A specific mechanism that explains a generic reference label is a valid superset, not a contradiction.\n\n**4 — Very close / related to the root cause.** The response identifies the right subsystem and a mechanism compatible with the reference. It may lack the final hop or one piece of evidence, but a reasonable on-call reviewer would agree it captures the same root cause.\n\n**3 — Got a few significant details right.** Several relevant symptoms, timelines, or components are identified, but the primary cause is not pinpointed or is only partially compatible with the reference mechanism.\n\n**2 — Got a few minor details right.** Plausible but off-target domain (right cluster, wrong service) or vague correlations. A few details happen to be correct but the overall direction is unhelpful.\n\n**1 — Misleading / Factually incorrect.** Wrong root cause, irrelevant symptoms, or analysis that would send the team down a blind alley. Materially contradicts the reference mechanism.\n\n### Superset compatibility\nIf the reference uses a generic or shorthand label (e.g., "service blip", "argo blip", "deployment + config change") and the response provides a more specific, evidence-backed mechanism that explains the reference (e.g., identifying the specific trigger, component, or sequence behind the generic label), treat the response as COMPATIBLE — score 4 or 5 depending on evidence quality. A specific mechanism that explains the reference is a valid superset, not a contradiction.\n\n### Evaluation guidance\n- If ranked hypotheses are present, score based on the best-matching hypothesis, regardless of its rank position.\n- Exact wording is NOT required; synonymous or equivalent mechanism phrasing is acceptable.\n- Broad class-only similarity (e.g., "dependency issue" when the reference is a specific rollout) is insufficient for score 4+.\n- Incident timeline declarations (INCIDENT_DECLARED / PEV descriptions) are secondary context only, not primary-cause evidence.\n- Do not penalize detailed responses if the primary cause remains clear and actionable.\n- Uncertainty handled explicitly and responsibly (e.g., "most likely cause" + limitations) is acceptable if the most-likely cause is reference-compatible.\n';

export const GENERAL_RUBRIC =
  "## Reward Function (1-5 scale)\n\nScore the agent's response against the reference answer using this reward function:\n\n**5 — Fully achieved.** The goal is completely met. The response matches or exceeds the reference answer with supporting evidence.\n\n**4 — Nearly complete.** Very close to the reference answer with only minor gaps. A reasonable reviewer would agree the core goal was met.\n\n**3 — Substantially correct.** Several significant aspects match the reference, but the response is incomplete or partially off-target.\n\n**2 — Partially correct.** A few minor details are right, but the response is mostly incomplete or off-base.\n\n**1 — Incorrect / Misleading.** The response is wrong, irrelevant, or would lead the user astray. Materially contradicts the reference answer.\n\n### Evaluation guidance\n- Treat the reference answer as the canonical expected outcome, not an exact wording template.\n- Synonymous or equivalent phrasing is acceptable.\n- Do NOT fail solely because the response includes extra details, timelines, or secondary findings.\n- Do not penalize detailed or verbose responses if the core answer remains clear.\n";

export const GOLDEN_ALERT_EVAL_CONSTRAINTS =
  '\n\n[EVAL-ONLY INVESTIGATION CONSTRAINTS]\n- Use monitor config, metrics, logs, and change-event evidence that occurs BEFORE the first INCIDENT_DECLARED event in the alert window.\n- You may query incident timelines only to determine a cutoff time. Do NOT use incident declarations (PEV text, incident titles) as primary root-cause evidence.\n- Do NOT use post-incident mitigation/resolution updates as causal evidence.\n- If pre-incident evidence is insufficient, explicitly state that limitation.';

export const GOAL_SYSTEM_TEMPLATE =
  'You are evaluating whether an AI agent achieved the primary goal of a golden CI test.\n\n## Test Context\n- User Query: {query}\n- Test Category: {test_category}\n\n## Reference Answer\n{goal_reference_answer}\n\n{rubric}\n\n## Output format\nReturn ONLY:\n- score: integer 1-5 per the reward function above\n- summary: concise reasoning for the score (2-3 sentences)\n';

export const GOAL_USER_TEMPLATE =
  '## Agent Trajectory\n{formatted_trajectory}\n\n## Final Response\n{final_answer}\n\nEvaluate the response against the reference and return the structured result.\n';

export const SHARED_SYSTEM_TEMPLATE =
  "You are a reward-model evaluator for an AI alert-investigation system.\nYour job is to score the agent's investigation answer across multiple reward dimensions.\n\nMechanism classes (use exactly one per answer):\nfalse_positive, deployment, config_change, traffic_surge, transient_blip, combined_cause, infrastructure_fault, incident_link, capacity_pressure, experiment_artifact, unknown\n\nDefinitions:\n- false_positive: alert fired but metric is actually normal / no real issue\n- deployment: a code/image/artifact deploy caused the incident\n- config_change: a runtime config, feature flag, or kill-switch change caused it\n- traffic_surge: organic or load-test traffic increase caused it\n- transient_blip: short-lived spike with no identifiable cause\n- combined_cause: two or more independent causes together caused it\n- infrastructure_fault: hardware, JVM GC storm, OOM, disk, network issue\n- incident_link: alert is a symptom of a separately-declared incident\n- capacity_pressure: sustained demand exceeding capacity (not a single deploy)\n- experiment_artifact: a Z-score / WoW comparison anomaly caused by an experiment affecting the baseline\n- unknown: cannot determine from available evidence\n\nReference answer: {reference}\nQuery: {query}\n";

export const SHARED_USER_TEMPLATE =
  'Agent trajectory (tool calls + outputs, truncated):\n{trajectory_text[:6000]}\n\nAgent final answer:\n{final_answer[:4000]}\n\nScore all dimensions and return structured output.\n';

export const FOCUS_SYSTEM_TEMPLATE =
  'You are evaluating the hypothesis quality of an alert investigation answer. Score the answer on hypothesis focus — you do NOT need a reference answer. Evaluate purely based on the structure and specificity of the hypotheses presented.';

export const FOCUS_USER_TEMPLATE = 'Agent final answer:\n{final_answer[:4000]}';

export const EVIDENCE_SYSTEM_TEMPLATE =
  'You are evaluating the evidence quality of an alert investigation answer. Score ONLY based on how well claims are supported by evidence. You do NOT need a reference answer — evaluate the internal quality of reasoning.';

export const EVIDENCE_USER_TEMPLATE =
  'Agent trajectory (tool calls + outputs, truncated):\n{trajectory_text[:4000]}\n\nAgent final answer:\n{final_answer[:4000]}';

export const goalSchema = z.object({
  score: z
    .number()
    .int()
    .describe(
      'Reward score on a 1-5 scale: 1 = Misleading/Incorrect, 2 = Minor details right, 3 = Significant details right, 4 = Very close to root cause, 5 = Found the root cause / Fully achieved goal'
    ),
  summary: z.string().describe('Concise reasoning for the score'),
});

export const sharedSchema = z.object({
  reference_mechanism_class: z
    .string()
    .describe(
      'Mechanism class of the REFERENCE answer. One of: false_positive, deployment, config_change, traffic_surge, transient_blip, combined_cause, infrastructure_fault, incident_link, capacity_pressure, experiment_artifact, unknown'
    ),
  agent_mechanism_class: z
    .string()
    .describe(
      'Mechanism class of the AGENT answer. One of: false_positive, deployment, config_change, traffic_surge, transient_blip, combined_cause, infrastructure_fault, incident_link, capacity_pressure, experiment_artifact, unknown'
    ),
  mechanism_class_match: z
    .boolean()
    .describe('True if reference_mechanism_class == agent_mechanism_class'),
  timeline_contradiction_found: z
    .boolean()
    .describe(
      "True if the agent's own evidence shows the proposed cause timestamp comes AFTER the metric/alert onset timestamp \u2014 a self-contradiction."
    ),
  timeline_reasoning: z.string().describe('One-sentence explanation of the timeline check.'),
  signal_coverage_score: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Fraction of key signals/metrics needed to confirm the reference RC that the agent actually queried. 1.0 = all covered, 0.0 = none.'
    ),
  signal_coverage_reasoning: z
    .string()
    .describe('Brief explanation: which signals were needed, which were queried.'),
  is_combined_cause: z
    .boolean()
    .describe(
      'True if the reference answer requires multiple independent causes to be identified.'
    ),
  cause_completeness_score: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'When is_combined_cause=True: fraction of reference sub-causes found in the agent answer. When is_combined_cause=False: 1.0 if primary cause matches, 0.0 otherwise.'
    ),
  stated_confidence: z
    .number()
    .nullable()
    .describe(
      'Probability / confidence stated by the agent for its primary hypothesis (0.0-1.0). Null if no explicit confidence was stated.'
    ),
  confidence_overconfident: z
    .boolean()
    .describe(
      'True if the agent stated high confidence (>= 0.70) for a primary cause that materially contradicts or omits the reference mechanism.'
    ),
  used_post_incident_evidence: z
    .boolean()
    .describe(
      'True if the agent cited post-incident resolution text, INCIDENT_DECLARED declarations, PEV titles, or mitigation/resolution notes as primary causal evidence.'
    ),
  anti_leakage_reasoning: z
    .string()
    .describe('One sentence: what post-incident evidence was used (if any).'),
});

export const focusSchema = z.object({
  num_hypotheses: z.number().int().describe('Number of ranked hypotheses in the final answer.'),
  top_hypothesis_probability: z
    .number()
    .nullable()
    .describe('Stated probability of the top-ranked hypothesis (0.0-1.0). Null if not stated.'),
  hypotheses_are_distinct: z
    .boolean()
    .describe(
      'True if each ranked hypothesis describes a genuinely different causal mechanism. False if hypotheses overlap, restate the same cause with different wording, or are sub-variants of a single mechanism.'
    ),
  primary_hypothesis_is_specific: z
    .boolean()
    .describe(
      "True if the top hypothesis names a concrete trigger (specific DV key, deploy version, service name, traffic source) rather than a vague category like 'config change' or 'dependency issue'."
    ),
  reasoning: z.string().describe('One-sentence justification of the scores.'),
});

export const evidenceSchema = z.object({
  claims_with_metric_evidence: z
    .number()
    .int()
    .describe(
      'Number of claims in the answer that cite a specific metric query result (value, timestamp, rate).'
    ),
  claims_without_evidence: z
    .number()
    .int()
    .describe(
      'Number of claims that are stated without any supporting metric, log, or change-event evidence.'
    ),
  evidence_is_quantitative: z
    .boolean()
    .describe(
      "True if the key evidence includes specific numbers (error rates, QPS values, percentages, timestamps) rather than qualitative descriptions like 'errors increased'."
    ),
  causal_chain_grounded: z
    .boolean()
    .describe(
      'True if the answer traces a specific causal chain from trigger \u2192 mechanism \u2192 symptom, with each link supported by observed data. False if the chain has speculative leaps.'
    ),
  reasoning: z.string().describe('One-sentence justification.'),
});
