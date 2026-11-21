/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { PROCEDURE_PHASES } from '../../../../common/investigations/types';
import type {
  Actor,
  InvestigationItem,
  InvestigationRecord,
  TaskItem,
  TaskOwnerType,
} from '../../../../common/investigations/types';
import { useInvestigationsServices } from '../../services';
import * as i18n from './translations';

export const MAX_TASKS = 400;
export const MAX_REASON_LENGTH = 2048;
export const MAX_NAME_LENGTH = 512;

export const PHASES = PROCEDURE_PHASES;

export type EffectiveTaskStatus = 'todo' | 'doing' | 'done' | 'skipped' | 'waiting' | 'blocked';
export type TaskFilter = 'all' | 'mine' | 'open' | 'required';

export const OWNER_TYPES: readonly TaskOwnerType[] = ['person', 'team', 'agent', 'automation'];

export const OWNER_TYPE_LABELS: Record<TaskOwnerType, string> = {
  person: i18n.OWNER_PERSON,
  team: i18n.OWNER_TEAM,
  agent: i18n.OWNER_AGENT,
  automation: i18n.OWNER_AUTOMATION,
};

export const STATUS_LABELS: Record<EffectiveTaskStatus, string> = {
  todo: i18n.STATUS_TODO,
  doing: i18n.STATUS_DOING,
  done: i18n.STATUS_DONE,
  skipped: i18n.STATUS_SKIPPED,
  waiting: i18n.STATUS_WAITING,
  blocked: i18n.STATUS_BLOCKED,
};

export const isTaskFinished = (task: TaskItem): boolean =>
  task.status === 'done' || task.status === 'skipped';

export const isTaskUnassigned = (task: TaskItem): boolean =>
  !task.task.owner.id && !task.task.owner.name;

/** The status a person sees: waiting on another task, blocked by a claim, or the stored one. */
export const getEffectiveStatus = (
  task: TaskItem,
  tasksById: ReadonlyMap<string, TaskItem>,
  claimsById: ReadonlyMap<string, InvestigationItem>
): EffectiveTaskStatus => {
  if (isTaskFinished(task)) {
    return task.status;
  }
  const dependencyId = task.task.depends_on;
  if (dependencyId) {
    const dependency = tasksById.get(dependencyId);
    if (dependency && !isTaskFinished(dependency)) {
      return 'waiting';
    }
  }
  const { auto } = task.task;
  if (auto?.type === 'claim' && auto.claim_id) {
    const claim = claimsById.get(auto.claim_id);
    if (claim && claim.kind === 'claim' && claim.status === 'blocked') {
      return 'blocked';
    }
  }
  return task.status === 'doing' ? 'doing' : 'todo';
};

export const sortTasks = (tasks: readonly TaskItem[]): TaskItem[] =>
  [...tasks].sort(
    (a, b) =>
      a.task.order - b.task.order || a.ref.localeCompare(b.ref, undefined, { numeric: true })
  );

export interface CurrentUser {
  username: string;
  fullName: string;
}

/** The signed-in user, once known. */
export const useCurrentUser = (): CurrentUser | undefined => {
  const { security } = useInvestigationsServices();
  const [user, setUser] = useState<CurrentUser | undefined>();

  useEffect(() => {
    let isMounted = true;
    security.authc
      .getCurrentUser()
      .then((current) => {
        if (isMounted) {
          setUser({ username: current.username, fullName: current.full_name ?? current.username });
        }
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [security]);

  return user;
};

export const isOwnedBy = (task: TaskItem, user: CurrentUser | undefined): boolean => {
  const { owner } = task.task;
  if (!user || owner.type !== 'person') {
    return false;
  }
  return owner.id === user.username || owner.name === user.fullName || owner.name === user.username;
};

export const personOwner = (user: CurrentUser): TaskItem['task']['owner'] => ({
  type: 'person',
  id: user.username,
  name: user.fullName,
});

export const getAgentOwner = (record: InvestigationRecord): TaskItem['task']['owner'] | null =>
  record.ai_enabled && record.agent_id
    ? { type: 'agent', id: record.agent_id, name: record.agent_name ?? record.agent_id }
    : null;

export const AUTOMATION_OWNER: TaskItem['task']['owner'] = {
  type: 'automation',
  id: 'workflow',
  name: 'Workflow',
};

export const UNASSIGNED_OWNER: TaskItem['task']['owner'] = {
  type: 'person',
  id: null,
  name: null,
};

export const getActorKindLabel = (actor: Actor): string =>
  actor.type === 'agent'
    ? i18n.OWNER_AGENT.toLowerCase()
    : actor.type === 'automation'
    ? i18n.OWNER_AUTOMATION.toLowerCase()
    : i18n.OWNER_PERSON.toLowerCase();
