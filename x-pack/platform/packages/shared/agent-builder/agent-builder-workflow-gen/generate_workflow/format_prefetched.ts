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
