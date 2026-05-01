/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSummary, StepDefinitionSummary } from './types';

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

export const formatStepEntry = (s: StepDefinitionSummary): string => {
  const labelIsRedundant = normalize(s.label) === normalize(s.id);
  const description = s.description && s.description !== s.label ? s.description : undefined;

  let line = `- ${s.id}`;
  if (!labelIsRedundant) {
    line += ` (${s.label})`;
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
