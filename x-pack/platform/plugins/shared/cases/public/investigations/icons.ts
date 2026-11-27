/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActorType,
  ClaimStatus,
  EntityType,
  EvidenceType,
  LinkKind,
  ProposalCategory,
  TaskOwnerType,
  TaskStatus,
} from '../../common/investigations/types';

/**
 * The single source of icons for the Investigations app. Every name exists in the installed
 * EUI (123.5). Use these constants instead of literal icon names so one concept always gets
 * the same icon.
 */
export const ICONS = {
  // Generic controls
  search: 'search',
  dragHandle: 'dragVertical',
  quote: 'quote',
  priority: 'flag',
  status: 'dotInCircle',
  paused: 'pause',
  settings: 'gear',
  close: 'cross',
  add: 'plus',
  check: 'check',
  chevronDown: 'chevronSingleDown',
  chevronRight: 'chevronSingleRight',
  chevronLeft: 'chevronSingleLeft',
  chevronUp: 'chevronSingleUp',
  external: 'external',
  info: 'info',
  question: 'question',
  warning: 'warning',
  error: 'error',
  copy: 'copy',
  trash: 'trash',
  lock: 'lock',
  minus: 'minus',
  link: 'link',
  send: 'send',
  mention: 'at',
  pin: 'pin',
  pinned: 'pinFilled',
  download: 'download',
  upload: 'upload',
  export: 'export',
  filter: 'filter',
  refresh: 'refresh',
  edit: 'pencil',
  menu: 'boxesVertical',
  thumbUp: 'thumbUp',
  sortAscending: 'sortUp',
  sortDescending: 'sortDown',

  // Domain concepts
  investigation: 'inspect',
  agent: 'productAgent',
  automation: 'gear',
  user: 'user',
  users: 'users',
  team: 'users',
  conversation: 'comment',
  thread: 'comment',
  evidence: 'documents',
  claim: 'bullseye',
  proposal: 'flag',
  procedure: 'listCheck',
  scope: 'branch',
  activity: 'timeline',
  timelineEvent: 'tokenEvent',
  verdict: 'checkCircle',
  report: 'document',
  history: 'clockCounter',
  merge: 'merge',
  handoff: 'push',
  related: 'link',
  preserved: 'lock',
  hash: 'key',
  expired: 'clock',
  restricted: 'lock',
  origin: 'logIn',
  disruptive: 'warning',
  graphNode: 'dot',
  rule: 'securitySignalDetected',
  unknownActor: 'question',
  process: 'gear',
  template: 'gear',
  reviewNeeded: 'eye',
  stale: 'clockCounter',
  pause: 'pause',
  resume: 'play',
  case: 'briefcase',
  runWorkflow: 'play',
  unlink: 'linkSlash',
} as const;

export const ACTOR_ICONS: Record<ActorType, string> = {
  user: ICONS.user,
  agent: ICONS.agent,
  automation: ICONS.automation,
};

export const EVIDENCE_TYPE_ICONS: Record<EvidenceType, string> = {
  alert: 'warning',
  event: 'tokenEvent',
  entity: 'user',
  indicator: 'shield',
  query: 'query',
  saved_search: 'search',
  visualization: 'visLine',
  file: 'document',
  note: 'comment',
  finding: 'listCheck',
  conversation: 'productAgent',
};

export const ENTITY_TYPE_ICONS: Record<EntityType, string> = {
  host: 'display',
  user: 'user',
  nhi: 'key',
  external: 'globe',
};

export const LINK_KIND_ICONS: Record<LinkKind, string> = {
  execution: 'play',
  ownership: 'key',
  authentication: 'logIn',
  network: 'globe',
  lateral_movement: 'merge',
};

export const CLAIM_STATUS_ICONS: Record<ClaimStatus, string> = {
  open: 'question',
  supported: 'checkCircle',
  blocked: 'minusCircle',
  refuted: 'crossCircle',
};

export const TASK_STATUS_ICONS: Record<TaskStatus, string> = {
  open: 'dashedCircle',
  in_progress: 'clock',
  completed: 'checkCircleFill',
  cancelled: 'minusCircle',
};

export const TASK_OWNER_ICONS: Record<TaskOwnerType, string> = {
  person: 'user',
  team: 'users',
  agent: 'productAgent',
  automation: 'gear',
};

export const PROPOSAL_CATEGORY_ICONS: Record<ProposalCategory, string> = {
  Contain: 'lock',
  Block: 'crossCircle',
  Escalate: 'bell',
  'Collect evidence': 'download',
  'Tune detection': 'controls',
};
