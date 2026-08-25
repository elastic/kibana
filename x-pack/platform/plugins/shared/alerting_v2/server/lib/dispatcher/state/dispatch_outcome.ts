/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionGroup,
  ActionGroupId,
  ActionPolicyDestination,
  DispatchFailure,
} from '../types';

/**
 * What actually happened during dispatch (DispatchStep): workflow execution ids
 * per successfully scheduled group, plus every failed (group, destination) attempt.
 */
export class DispatchOutcome {
  private constructor(
    public readonly failures: readonly DispatchFailure[],
    public readonly executionsByGroup: ReadonlyMap<ActionGroupId, string[]>,
    private readonly failedWorkflowsByGroup: ReadonlyMap<ActionGroupId, ReadonlySet<string>>
  ) {}

  public static of({
    executionsByGroup,
    failures,
  }: {
    executionsByGroup: ReadonlyMap<ActionGroupId, string[]>;
    failures: readonly DispatchFailure[];
  }): DispatchOutcome {
    const failedWorkflowsByGroup = new Map<ActionGroupId, Set<string>>();
    for (const { actionGroupId, workflowId } of failures) {
      let ids = failedWorkflowsByGroup.get(actionGroupId);
      if (!ids) failedWorkflowsByGroup.set(actionGroupId, (ids = new Set()));
      ids.add(workflowId);
    }
    return new DispatchOutcome(failures, executionsByGroup, failedWorkflowsByGroup);
  }

  public static empty(): DispatchOutcome {
    return DispatchOutcome.of({ executionsByGroup: new Map(), failures: [] });
  }

  public executionIdsFor(groupId: ActionGroupId): readonly string[] {
    return this.executionsByGroup.get(groupId) ?? [];
  }

  /**
   * Destinations of the group that actually delivered. A group with
   * destinations but none delivered failed completely and must not appear in
   * the `dispatched` summary — its episodes are carried by `dispatch_failed`.
   */
  public deliveredDestinationsFor(group: ActionGroup): readonly ActionPolicyDestination[] {
    const failed = this.failedWorkflowsByGroup.get(group.id);
    return failed != null
      ? group.destinations.filter((destination) => !failed.has(destination.id))
      : group.destinations;
  }

  public hasFailures(): boolean {
    return this.failures.length > 0;
  }
}
