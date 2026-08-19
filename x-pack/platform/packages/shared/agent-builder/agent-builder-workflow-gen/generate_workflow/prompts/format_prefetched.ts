/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSummary, StepDefinitionSummary, TriggerDefinitionSummary } from '../types';

/* ---------------- Connectors ---------------- */

export interface ConnectorActionTypeGroup {
  actionTypeId: string;
  stepTypes: string[];
  instances: Array<{ id: string; name: string }>;
}

export const groupConnectorsByActionType = (
  connectors: ConnectorSummary[]
): ConnectorActionTypeGroup[] => {
  const map = new Map<string, ConnectorActionTypeGroup>();
  for (const c of connectors) {
    const existing = map.get(c.actionTypeId);
    if (existing) {
      existing.instances.push({ id: c.id, name: c.name });
    } else {
      map.set(c.actionTypeId, {
        actionTypeId: c.actionTypeId,
        stepTypes: c.stepTypes,
        instances: [{ id: c.id, name: c.name }],
      });
    }
  }
  return [...map.values()];
};

export const formatConnectorsBlock = (connectors: ConnectorSummary[]): string => {
  if (connectors.length === 0) {
    return 'No connectors are configured in the user environment.';
  }
  return groupConnectorsByActionType(connectors)
    .map((g) =>
      [
        `### ${g.actionTypeId}`,
        `Step types: ${g.stepTypes.join(', ')}`,
        'Instances:',
        ...g.instances.map((i) => `  - ${i.id} (${i.name})`),
      ].join('\n')
    )
    .join('\n\n');
};

/* ---------------- Step entry ---------------- */

const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Strip a trailing parenthetical hint from a label only when its content
// matches the id exactly (e.g. "Loop (foreach)" with id "foreach" → "Loop").
// We do NOT strip when the parenthetical adds discriminating info that's
// not just a verbatim id repeat (e.g. "Execute Workflow (Async)" with id
// "workflow.executeAsync" — paren content "Async" ≠ id, keep it).
const cleanLabel = (label: string, id: string): string => {
  const match = label.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!match) return label.trim();
  const [, head, paren] = match;
  if (normalize(paren) === normalize(id)) {
    return head.trim();
  }
  return label.trim();
};

// Drop the label only when it is "smaller-or-equal" to the id (i.e. a
// substring of the id after normalization). When the label is BIGGER than
// the id (id ⊆ label), the label is adding context — keep it.
// Examples:
//   - id="loop.break", label="Break"          → label ⊆ id  → drop
//   - id="console", label="Console"           → label = id  → drop
//   - id="teams",   label="Microsoft Teams"   → id ⊆ label  → keep
//   - id="servicenow", label="ServiceNow ITSM" → id ⊆ label → keep
const isLabelRedundant = (label: string, id: string): boolean => {
  const nLabel = normalize(label);
  if (!nLabel) return true;
  const nId = normalize(id);
  return nId.includes(nLabel);
};

export const formatStepEntry = (s: StepDefinitionSummary): string => {
  const cleanedLabel = cleanLabel(s.label, s.id);
  const labelRedundant = isLabelRedundant(cleanedLabel, s.id);
  const description =
    s.description && s.description !== s.label && s.description !== cleanedLabel
      ? s.description
      : undefined;

  let line = `- ${s.id}`;
  if (!labelRedundant) {
    line += ` (${cleanedLabel})`;
  }
  if (description) {
    line += ` — ${description}`;
  }
  return line;
};

/* ---------------- Sub-action family collapse ---------------- */

export interface CollapsedFamily {
  prefix: string;
  count: number;
}

export interface CollapsedFamilies {
  enumerated: StepDefinitionSummary[];
  collapsed: CollapsedFamily[];
}

const prefixOf = (id: string): string => {
  const dot = id.indexOf('.');
  return dot === -1 ? id : id.slice(0, dot);
};

export const collapseSubActionFamilies = (
  steps: StepDefinitionSummary[],
  threshold: number
): CollapsedFamilies => {
  const byPrefix = new Map<string, StepDefinitionSummary[]>();
  for (const s of steps) {
    const p = prefixOf(s.id);
    const arr = byPrefix.get(p);
    if (arr) {
      arr.push(s);
    } else {
      byPrefix.set(p, [s]);
    }
  }

  const enumerated: StepDefinitionSummary[] = [];
  const collapsed: CollapsedFamily[] = [];

  for (const [prefix, group] of byPrefix) {
    // A "family" is only meaningful when there are multiple sub-actions sharing
    // the same prefix. A single id with no dot is just a step, not a family.
    const isMultiActionFamily = group.length > 1 && group.every((s) => s.id.includes('.'));
    if (isMultiActionFamily && group.length > threshold) {
      collapsed.push({ prefix, count: group.length });
    } else {
      enumerated.push(...group);
    }
  }

  return { enumerated, collapsed };
};

/* ---------------- Section bucketing ---------------- */

export interface StepSection {
  title: string;
  steps: StepDefinitionSummary[];
}

const SECTION_ORDER = [
  'Control flow',
  'Data manipulation',
  'AI',
  'Cases',
  'Elasticsearch',
  'Logging / Diagnostics',
  'Other Kibana built-ins',
  'Connector steps',
] as const;

const sectionOf = (s: StepDefinitionSummary): (typeof SECTION_ORDER)[number] => {
  if (s.id === 'console') return 'Logging / Diagnostics';
  switch (s.category) {
    case 'flowControl':
      return 'Control flow';
    case 'data':
      return 'Data manipulation';
    case 'ai':
      return 'AI';
    case 'kibana.cases':
      return 'Cases';
    case 'elasticsearch':
      return 'Elasticsearch';
    case 'kibana':
      return 'Other Kibana built-ins';
    default:
      return 'Connector steps';
  }
};

export const bucketStepsBySection = (steps: StepDefinitionSummary[]): StepSection[] => {
  const buckets = new Map<string, StepDefinitionSummary[]>();
  for (const s of steps) {
    const key = sectionOf(s);
    const arr = buckets.get(key);
    if (arr) {
      arr.push(s);
    } else {
      buckets.set(key, [s]);
    }
  }
  return SECTION_ORDER.filter((title) => buckets.has(title)).map((title) => ({
    title,
    steps: buckets.get(title)!,
  }));
};

const CONNECTOR_STEPS_SECTION = 'Connector steps';

export const formatStepDefinitionsBlock = (
  steps: StepDefinitionSummary[],
  options: { connectorCollapseThreshold?: number } = {}
): string => {
  // Only the connector-steps section gets collapse treatment — every other
  // section is a curated short list that should always enumerate fully.
  // Default threshold of 1 collapses any connector multi-action family.
  const connectorCollapseThreshold = options.connectorCollapseThreshold ?? 1;
  const sections = bucketStepsBySection(steps);

  return sections
    .map((section) => {
      const lines: string[] = [`### ${section.title}`];
      if (section.title === CONNECTOR_STEPS_SECTION) {
        const { enumerated, collapsed } = collapseSubActionFamilies(
          section.steps,
          connectorCollapseThreshold
        );
        lines.push(...enumerated.map(formatStepEntry));
        for (const fam of collapsed) {
          lines.push(`- ${fam.prefix}.* (${fam.count} actions)`);
        }
      } else {
        lines.push(...section.steps.map(formatStepEntry));
      }
      return lines.join('\n');
    })
    .join('\n\n');
};

/* ---------------- Triggers ---------------- */

export const formatTriggersBlock = (defs: TriggerDefinitionSummary[]): string =>
  defs
    .map((d) => {
      const cleanedLabel = cleanLabel(d.label, d.id);
      const labelRedundant = isLabelRedundant(cleanedLabel, d.id);
      const description =
        d.description && d.description !== d.label && d.description !== cleanedLabel
          ? d.description
          : undefined;
      let line = `- ${d.id}`;
      if (!labelRedundant) {
        line += ` (${cleanedLabel})`;
      }
      if (description) {
        line += ` — ${description}`;
      }
      return line;
    })
    .join('\n');
