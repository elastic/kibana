/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const buildReadableSummary = (params: Record<string, unknown>): string => {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const label = key.replace(/_/g, ' ');
    if (typeof value === 'string') {
      lines.push(`**${label}:** ${value}`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`**${label}:** ${String(value)}`);
    } else if (Array.isArray(value)) {
      lines.push(`**${label}:** ${value.length} item${value.length !== 1 ? 's' : ''}`);
    } else if (typeof value === 'object') {
      const keys = Object.keys(value as Record<string, unknown>);
      lines.push(`**${label}:** ${keys.join(', ')}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : '(no details available)';
};

export const getConfirmationMessage = (
  toolParams: Record<string, unknown>,
  descriptionKey: string
): string => {
  const { [descriptionKey]: description, ...rest } = toolParams;
  if (typeof description === 'string' && description.length > 0) {
    return description;
  }
  return buildReadableSummary(rest);
};
