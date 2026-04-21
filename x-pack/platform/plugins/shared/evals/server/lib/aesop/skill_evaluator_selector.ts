/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EvaluatorRegistry } from '../evaluation_engine';
import { buildLlmRequestBody, extractLlmResponseText, getConnectorTypeId } from './llm_defaults';

/**
 * Analyzes skill content to select the most relevant evaluators and
 * optionally generate a custom LLM-judge evaluator tailored to the skill.
 */

export interface ProposedEvaluator {
  name: string;
  description: string;
  kind: 'LLM' | 'CODE';
  type: 'llm-judge' | 'code' | 'esql' | 'prebuilt';
  source: 'prebuilt' | 'auto-generated';
  selected: boolean;
  config?: {
    prompt_template?: string;
    scoring_mode?: string;
    feedback_key?: string;
  };
  rationale: string;
}

export interface EvaluatorSelection {
  /** Evaluator names to use (from registry) */
  evaluatorNames: string[];
  /** Optional custom evaluator generated for this specific skill */
  customEvaluator?: {
    name: string;
    description: string;
    promptTemplate: string;
  };
  /** Rationale for why these evaluators were selected */
  rationale: string;
}

interface SkillContent {
  name: string;
  description: string;
  markdown: string;
}

/** Checks if the skill markdown contains ES|QL code blocks */
const hasEsql = (markdown: string): boolean =>
  /```esql/i.test(markdown) || /\bFROM\s+[\w.*-]+/i.test(markdown);

/** Checks if the skill references specific indices */
const hasIndexReferences = (markdown: string): boolean =>
  /\.(alerts|fleet|kibana|chat|aesop|internal)[-\w]*/i.test(markdown) ||
  /\b(logs|metrics|traces|packetbeat|winlogbeat|filebeat)-/i.test(markdown);

/** Checks if the skill involves tool usage */
const hasToolUsage = (markdown: string): boolean =>
  /platform\.core\.\w+/i.test(markdown) || /tool_id/i.test(markdown);

/** Checks if the skill is security/SOC focused */
const isSecurityDomain = (markdown: string): boolean =>
  /\b(alert|threat|malware|CVE|MITRE|ATT&CK|incident|forensic|IOC|C2|lateral.movement|brute.force|phishing|ransomware)\b/i.test(
    markdown
  );

/** Checks if the skill involves data visualization */
const isVisualizationDomain = (markdown: string): boolean =>
  /\b(visualization|dashboard|chart|panel|lens|metric|bar|pie|donut|heatmap)\b/i.test(markdown);

/** Checks if the skill involves entity analytics */
const isEntityAnalyticsDomain = (markdown: string): boolean =>
  /\b(entity|risk.score|user.risk|host.risk|asset.criticality|anomal)\b/i.test(markdown);

export const selectEvaluatorsForSkill = (
  skill: SkillContent,
  registry: EvaluatorRegistry,
  logger: Logger
): EvaluatorSelection => {
  const { markdown } = skill;
  const selectedNames: string[] = [];
  const reasons: string[] = [];

  // ── Tier 1: Always-on LLM evaluator ──
  if (registry.has('skill-safety')) {
    selectedNames.push('skill-safety');
    reasons.push('safety check (always required)');
  }

  // ── Tier 2: Best-fit quality evaluator (exactly 1 LLM) ──
  // Pick the single most relevant quality evaluator based on domain.
  if (hasEsql(markdown) && registry.has('skill-accuracy')) {
    selectedNames.push('skill-accuracy');
    reasons.push('accuracy (ES|QL syntax and field correctness — best fit for ES|QL skills)');
  } else if (isSecurityDomain(markdown) && registry.has('skill-relevance')) {
    selectedNames.push('skill-relevance');
    reasons.push('relevance (SOC workflow alignment — best fit for security skills)');
  } else if (hasToolUsage(markdown) && registry.has('skill-completeness')) {
    selectedNames.push('skill-completeness');
    reasons.push('completeness (step-by-step instructions — best fit for tool-using skills)');
  } else if (isVisualizationDomain(markdown) && registry.has('skill-specificity')) {
    selectedNames.push('skill-specificity');
    reasons.push('specificity (actionable specs — best fit for visualization skills)');
  } else if (registry.has('skill-completeness')) {
    selectedNames.push('skill-completeness');
    reasons.push('completeness (default quality evaluator)');
  }

  // ── Tier 3: Free CODE evaluators (no LLM cost) ──
  if (registry.has('skill-pii')) {
    selectedNames.push('skill-pii');
    reasons.push('PII detection (CODE — free)');
  }
  if (hasEsql(markdown) && registry.has('esql-pattern')) {
    selectedNames.push('esql-pattern');
    reasons.push('ES|QL pattern validation (CODE — free)');
  }
  if (hasIndexReferences(markdown) && registry.has('backing-index-validator')) {
    selectedNames.push('backing-index-validator');
    reasons.push('backing index validation (CODE — free)');
  }
  if (
    (hasToolUsage(markdown) || /\b(tool|action|function.call|agent.tool)\b/i.test(markdown)) &&
    registry.has('agent-efficiency')
  ) {
    selectedNames.push('agent-efficiency');
    reasons.push('agent efficiency (CODE — detects tool loops/retries/bloat)');
  }

  // Generate a custom LLM-judge prompt tailored to the skill's domain
  let customEvaluator: EvaluatorSelection['customEvaluator'];

  if (isVisualizationDomain(markdown)) {
    customEvaluator = {
      name: `skill-viz-quality-${skill.name
        .slice(0, 20)
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase()}`,
      description: `Custom evaluator for visualization skill: ${skill.name}`,
      promptTemplate: buildDomainPrompt('visualization', skill),
    };
    reasons.push('custom visualization quality evaluator (skill creates dashboards/charts)');
  } else if (isEntityAnalyticsDomain(markdown)) {
    customEvaluator = {
      name: `skill-entity-quality-${skill.name
        .slice(0, 20)
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase()}`,
      description: `Custom evaluator for entity analytics skill: ${skill.name}`,
      promptTemplate: buildDomainPrompt('entity-analytics', skill),
    };
    reasons.push('custom entity analytics evaluator (skill involves risk scoring/pivots)');
  } else if (isSecurityDomain(markdown)) {
    customEvaluator = {
      name: `skill-secops-quality-${skill.name
        .slice(0, 20)
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase()}`,
      description: `Custom evaluator for security operations skill: ${skill.name}`,
      promptTemplate: buildDomainPrompt('security-operations', skill),
    };
    reasons.push('custom SecOps evaluator (skill involves threat detection/investigation)');
  }

  logger.info(
    `[AESOP] Selected ${selectedNames.length} evaluators for "${skill.name}": ${selectedNames.join(
      ', '
    )}${customEvaluator ? ` + custom: ${customEvaluator.name}` : ''}`
  );

  return {
    evaluatorNames: selectedNames,
    customEvaluator,
    rationale: reasons.join('; '),
  };
};

/**
 * Builds the full list of proposed evaluators for a skill: prebuilt (selected + unselected)
 * plus any auto-generated custom evaluators. Optionally calls the LLM for additional suggestions.
 */
export const proposeEvaluatorsForSkill = async (
  skill: SkillContent,
  registry: EvaluatorRegistry,
  logger: Logger,
  llmOptions?: {
    connectorId: string;
    actionsClient: { execute: (...args: any[]) => Promise<any> };
  }
): Promise<{ proposed: ProposedEvaluator[]; rationale: string }> => {
  const selection = selectEvaluatorsForSkill(skill, registry, logger);
  const proposed: ProposedEvaluator[] = [];

  // Add selected prebuilt evaluators
  for (const evalName of selection.evaluatorNames) {
    const evaluator = registry.get(evalName);
    if (evaluator) {
      proposed.push({
        name: evaluator.name,
        description: evaluator.description,
        kind: evaluator.kind,
        type: evaluator.source === 'prebuilt' ? 'prebuilt' : 'llm-judge',
        source: 'prebuilt',
        selected: true,
        rationale:
          selection.rationale.split('; ').find((r) => r.includes(evalName)) ||
          'Selected by content analysis',
      });
    }
  }

  // Add unselected prebuilt evaluators so the user can toggle them on
  const allPrebuilt = registry.getAll().filter((e) => e.source === 'prebuilt');
  for (const evaluator of allPrebuilt) {
    if (!selection.evaluatorNames.includes(evaluator.name)) {
      proposed.push({
        name: evaluator.name,
        description: evaluator.description,
        kind: evaluator.kind,
        type: 'prebuilt',
        source: 'prebuilt',
        selected: false,
        rationale: 'Available but not auto-selected for this skill',
      });
    }
  }

  // Add auto-generated custom evaluator if one was proposed
  if (selection.customEvaluator) {
    proposed.push({
      name: selection.customEvaluator.name,
      description: selection.customEvaluator.description,
      kind: 'LLM',
      type: 'llm-judge',
      source: 'auto-generated',
      selected: true,
      config: {
        prompt_template: selection.customEvaluator.promptTemplate,
        scoring_mode: 'continuous',
        feedback_key: 'explanation',
      },
      rationale: "Custom evaluator tailored to this skill's domain",
    });
  }

  // LLM-powered suggestions (if connector is provided)
  if (llmOptions) {
    try {
      const existingNames = proposed.map((e) => e.name);
      const llmSuggestions = await generateLLMEvaluatorSuggestions(
        skill,
        llmOptions.connectorId,
        llmOptions.actionsClient,
        logger,
        existingNames
      );
      proposed.push(...llmSuggestions);
    } catch (err) {
      logger.warn(
        `LLM evaluator suggestion failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { proposed, rationale: selection.rationale };
};

/**
 * Asks the LLM to suggest 1 custom evaluator specific to the skill's domain
 * that prebuilt evaluators would miss. Defaults to selected: false.
 */
export const generateLLMEvaluatorSuggestions = async (
  skill: SkillContent,
  connectorId: string,
  actionsClient: { execute: (...args: any[]) => Promise<any>; get?: (...args: any[]) => any },
  logger: Logger,
  existingEvaluatorNames: string[] = []
): Promise<ProposedEvaluator[]> => {
  const existingList =
    existingEvaluatorNames.length > 0
      ? `\n\n## Already available evaluators (do NOT suggest duplicates):\n${existingEvaluatorNames.join(
          ', '
        )}`
      : '';

  const prompt = `You are an expert in AI evaluation design for Elastic Security.

Given this Agent Builder skill, suggest 1-2 custom evaluators that would catch quality issues specific to this skill's domain. Focus on what the prebuilt evaluators (safety, relevance, completeness, accuracy, specificity, ES|QL pattern, backing-index, PII) would miss.${existingList}

## Skill: ${skill.name}
${skill.description}

## Skill Content (first 2000 chars):
${skill.markdown.slice(0, 2000)}

Return a JSON array where each evaluator has:
- "name": lowercase-with-hyphens, descriptive (e.g., "dns-tunneling-detection-quality")
- "description": what this evaluator checks (1 sentence)
- "prompt_template": an LLM judge prompt with {input}, {output}, {reference} placeholders. The prompt should ask for a JSON response with score (0-1), label (pass/fail), and explanation.
- "rationale": why this evaluator is needed for this specific skill

Return ONLY a JSON array. If no additional evaluators are needed, return [].`;

  try {
    const connectorTypeId = await getConnectorTypeId(actionsClient as any, connectorId);
    const result = await actionsClient.execute({
      actionId: connectorId,
      params: {
        subAction: 'run',
        subActionParams: {
          body: JSON.stringify(
            buildLlmRequestBody({
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.3,
              connectorTypeId,
            })
          ),
        },
      },
    });

    const responseText = extractLlmResponseText((result as any)?.data);

    let cleaned = responseText;
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');
    cleaned = cleaned
      .replace(/```json?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item: any) => item.name && item.prompt_template)
      .slice(0, 1)
      .map((item: any) => ({
        name: String(item.name)
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .slice(0, 64),
        description: String(item.description || ''),
        kind: 'LLM' as const,
        type: 'llm-judge' as const,
        source: 'auto-generated' as const,
        selected: false,
        config: {
          prompt_template: String(item.prompt_template),
          scoring_mode: 'continuous',
          feedback_key: 'explanation',
        },
        rationale: String(item.rationale || 'LLM-suggested evaluator — enable manually if needed'),
      }));
  } catch (error) {
    logger.warn(
      `LLM evaluator generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
};

const buildDomainPrompt = (
  domain: 'visualization' | 'entity-analytics' | 'security-operations',
  skill: SkillContent
): string => {
  const domainCriteria: Record<string, string> = {
    visualization: `- Does the agent response include a concrete visualization specification (chart type, fields, aggregation)?
- Are the ES|QL queries suitable for the suggested chart type?
- Does it handle missing/sparse data gracefully?
- Are axis labels, titles, and legends meaningful for an analyst?`,
    'entity-analytics': `- Does the agent correctly identify the entity type (host/user/service)?
- Does it retrieve risk scores and explain what's driving the risk?
- Are the pivot queries grounded in the correct indices?
- Does it correlate entity risk with actual alert/event data?`,
    'security-operations': `- Does the agent follow the investigation workflow described in the skill?
- Are the ES|QL queries syntactically correct and targeting the right indices?
- Does it identify the right MITRE ATT&CK techniques or threat indicators?
- Would the response help a SOC analyst make a triage decision?`,
  };

  return `You are evaluating an AI agent's response to a security analyst query.
The agent was given this skill to guide its behavior:

## Skill: ${skill.name}
${skill.description}

## Domain-Specific Evaluation Criteria (${domain})
${domainCriteria[domain]}

## General Quality Criteria
- Is the response grounded in real data (not hallucinated)?
- Does it follow the skill's step-by-step instructions?
- Is it actionable — can the analyst act on it immediately?

## Scoring
Rate the response on a scale of 0.0 to 1.0 where:
- 0.0-0.3: Response is incorrect, misleading, or ignores the skill
- 0.4-0.6: Partially correct but missing key steps or data
- 0.7-0.8: Good response following the skill with minor gaps
- 0.9-1.0: Excellent response fully following the skill

## Input
User query: {input}

## Agent Response
{output}

## Expected Behavior
{reference}

Respond with JSON: {"score": <number>, "label": "pass"|"fail", "explanation": "<brief explanation>"}`;
};
