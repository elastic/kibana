/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared coding-sub-agent types used by both the coding runtime (which produces
 * the activity timeline) and the executor/persistence/routes (which store and
 * serve it). Kept in one place so the runtime and executor don't import each
 * other.
 */

export type OpencodePhase =
  | 'provisioning'
  | 'connecting'
  | 'credential'
  | 'thinking'
  | 'editing'
  | 'running'
  | 'searching'
  | 'kibana'
  | 'todo'
  | 'tool'
  | 'done';

export type OpencodeItemStatus = 'in_progress' | 'completed' | 'failed';

export interface OpencodeTodo {
  content: string;
  status: string;
}

/**
 * A single, UI-friendly activity item in the coding sub-agent timeline. Items
 * are keyed by `id` so live updates (streaming output, status changes) upsert in
 * place rather than appending duplicates.
 */
export interface OpencodeRunProgress {
  id: string;
  phase: OpencodePhase;
  label: string;
  status: OpencodeItemStatus;
  detail?: string;
  command?: string;
  output?: string;
  todos?: OpencodeTodo[];
  /** For edit/write tools: the path being written. */
  filePath?: string;
  /** For edit/write tools: the file content (write) or a diff (edit). */
  fileContent?: string;
  /** Language hint for the code block (derived from filePath extension). */
  fileLanguage?: string;
  /** Optional EUI icon override for this specific activity item. */
  iconType?: string;
  /** Optional product badge treatment for credential/infrastructure rows. */
  credentialIconVariant?: 'secured' | 'compute';
  /**
   * For `kibana` connector calls: the connector instance id, so the UI can
   * render that connector's own icon (resolved via its action type).
   */
  connectorId?: string;
  /**
   * Connector action type id for connector-owned sandbox CLI credential/setup
   * rows. Lets the UI render the connector icon even when it cannot resolve the
   * connector instance from the shared connector list.
   */
  actionTypeId?: string;
}
