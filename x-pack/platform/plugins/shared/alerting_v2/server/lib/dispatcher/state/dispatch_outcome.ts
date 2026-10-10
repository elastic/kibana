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

const NO_EXECUTIONS: readonly string[] = [];
const NO_COMMITTED_GROUPS: ReadonlySet<ActionGroupId> = new Set();

/**
 * What actually happened during dispatch (DispatchStep): workflow execution ids
 * per successfully scheduled group, plus every failed (group, destination) attempt.
 */
export class DispatchOutcome {
  private static readonly EMPTY = new DispatchOutcome([], new Map(), NO_COMMITTED_GROUPS);

  private readonly failedWorkflowsByGroup: ReadonlyMap<ActionGroupId, ReadonlySet<string>>;

  private constructor(
    public readonly failures: readonly DispatchFailure[],
    private readonly executionsByGroup: ReadonlyMap<ActionGroupId, readonly string[]>,
    private readonly committedGroupIds: ReadonlySet<ActionGroupId>
  ) {
    this.failedWorkflowsByGroup = indexFailedWorkflows(failures);
  }

  public static of({
    executionsByGroup,
    failures,
    committedGroupIds = NO_COMMITTED_GROUPS,
  }: {
    executionsByGroup: ReadonlyMap<ActionGroupId, readonly string[]>;
    failures: readonly DispatchFailure[];
    /** Groups whose `notified` records DispatchStep already wrote. */
    committedGroupIds?: ReadonlySet<ActionGroupId>;
  }): DispatchOutcome {
    return new DispatchOutcome(failures, executionsByGroup, committedGroupIds);
  }

  public static empty(): DispatchOutcome {
    return DispatchOutcome.EMPTY;
  }

  /** Number of groups with at least one scheduled workflow execution. */
  public get scheduledGroupCount(): number {
    return this.executionsByGroup.size;
  }

  public isCommitted(groupId: ActionGroupId): boolean {
    return this.committedGroupIds.has(groupId);
  }

  public executionIdsFor(groupId: ActionGroupId): readonly string[] {
    return this.executionsByGroup.get(groupId) ?? NO_EXECUTIONS;
  }

  /**
   * Destinations of the group that actually delivered. A group with
   * destinations but none delivered failed completely and must not appear in
   * the `dispatched` summary — its alerts are carried by `dispatch_failed`.
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

function indexFailedWorkflows(
  failures: readonly DispatchFailure[]
): ReadonlyMap<ActionGroupId, ReadonlySet<string>> {
  const index = new Map<ActionGroupId, Set<string>>();
  for (const { actionGroupId, workflowId } of failures) {
    let ids = index.get(actionGroupId);
    if (!ids) index.set(actionGroupId, (ids = new Set()));
    ids.add(workflowId);
  }
  return index;
}
