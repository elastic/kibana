/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_WORKFLOW_ID_LENGTH = 256;

/**
 * Prefix of the workflow concurrency group key a driver workflow runs under, followed by the
 * investigation (conversation) id: `investigation:<id>`.
 */
export const INVESTIGATION_CONCURRENCY_KEY_PREFIX = 'investigation:';

/** The investigation id a driver workflow execution works on, from its concurrency group key. */
export const parseInvestigationConcurrencyKey = (
  concurrencyGroupKey: string | undefined
): string | undefined => {
  if (!concurrencyGroupKey?.startsWith(INVESTIGATION_CONCURRENCY_KEY_PREFIX)) {
    return undefined;
  }
  const id = concurrencyGroupKey.slice(INVESTIGATION_CONCURRENCY_KEY_PREFIX.length);
  return id.length > 0 ? id : undefined;
};

/**
 * Workflows that drive investigations: a solution registers the workflow that runs its
 * investigation agent, and a non-terminal execution of it counts as the investigation being in
 * progress. Registered during setup; read on every in-progress lookup.
 */
export class InvestigationDriverWorkflowRegistry {
  private readonly workflowIds = new Set<string>();

  register(workflowId: string): void {
    if (workflowId.length < 1 || workflowId.length > MAX_WORKFLOW_ID_LENGTH) {
      throw new Error(
        `An investigation driver workflow id must have 1 to ${MAX_WORKFLOW_ID_LENGTH} characters`
      );
    }
    this.workflowIds.add(workflowId);
  }

  list(): string[] {
    return [...this.workflowIds];
  }
}
