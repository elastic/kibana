/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface WorkflowTrigger {
  type: 'alert' | 'scheduled' | 'manual' | 'page';
  with?: Record<string, unknown>;
}

/**
 * Parses interval string in format like "5m", "2h", "1d", "30s"
 * @returns Object with value and unit, or null if invalid
 */
export function parseIntervalString(
  intervalString: string
): { value: number; unit: string } | null {
  const match = intervalString.match(/^(\d+)([smhd])$/);
  if (!match) {
    return null;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  if (isNaN(value) || value < 1) {
    return null;
  }

  return { value, unit };
}
