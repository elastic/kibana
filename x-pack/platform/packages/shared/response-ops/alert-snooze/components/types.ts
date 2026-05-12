/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import type { ReactNode } from 'react';
import type { AlertSeverity } from '@kbn/rule-data-utils';

export type SnoozeUnit = 'm' | 'h' | 'd' | 'w' | 'M';
export type QuickDurationId = 'indefinitely' | '1h' | '8h' | '24h' | 'custom';
export type CustomSnoozeMode = 'duration' | 'datetime';
export type SnoozePanelTab = 'quick' | 'conditional';

export interface CustomDurationState {
  mode: CustomSnoozeMode;
  value: number;
  unit: SnoozeUnit;
  dateTime: Moment | null;
}

/**
 * Alias for the canonical `AlertSeverity` union from `@kbn/rule-data-utils`.
 * Kept under the package's existing `AlertSeverityLevel` name so consumers
 * importing it from `@kbn/response-ops-alert-snooze` are not broken.
 */
export type AlertSeverityLevel = AlertSeverity;

/**
 * Built-in data condition type identifiers.
 *
 * `DataConditionType` values are also used as `id`s on the built-in
 * `DataConditionTypeDescriptor`s. Consumers can register new types by
 * supplying additional descriptors with their own string ids.
 */
export enum DataConditionType {
  FIELD_CHANGE = 'field_change',
  SEVERITY_CHANGE = 'severity_change',
  SEVERITY_EQUALS = 'severity_equals',
}

/**
 * Discriminated union of API-shaped snooze conditions emitted by the panel
 * via `ConditionalSnoozeSchedule.conditions`.
 */
export type SnoozeCondition =
  | { type: DataConditionType.SEVERITY_CHANGE }
  | { type: DataConditionType.SEVERITY_EQUALS; value: AlertSeverityLevel }
  | { type: DataConditionType.FIELD_CHANGE; field: string }
  | { type: string; [payloadKey: string]: unknown };

/**
 * UI-side row state for a single data condition. The shape is intentionally
 * generic: `field` and `value` are reused as the two input slots that the
 * built-in descriptors need today. New descriptor types should reuse one of
 * these slots if possible ; if they need additional fields, extend the entry
 * via the index signature.
 */
export interface DataConditionEntry {
  id: string;
  type: string;
  field: string;
  value: AlertSeverityLevel;
  confirmed: boolean;
  [extra: string]: unknown;
}

export interface DataConditionDescriptorContext {
  /** All currently-pending entries (including this one), useful for
   * "is this descriptor a singleton?"-style checks. */
  allEntries: readonly DataConditionEntry[];
  /** Confirmed entries only (after a user has clicked the check icon). */
  confirmedEntries: readonly DataConditionEntry[];
  /** Operator selected on the parent panel (`any` or `all`). */
  conditionOperator: 'any' | 'all';
}

/**
 * A descriptor encapsulates everything the conditional snooze panel needs
 * to know about a single data-condition type.
 * Defining a new condition type is purely a matter of adding a descriptor;
 * no edits inside `ConditionalSnoozePanel` are required.
 */
export interface DataConditionTypeDescriptor {
  id: string;
  label: string;
  /** When true, only one entry of this type is allowed at a time; the
   *  dropdown filters this option out for new rows once one exists. */
  isSingleton?: boolean;
  /** Returns true when the entry has all the data it needs to be confirmed
   *  (gates the confirm button). */
  isComplete: (entry: DataConditionEntry) => boolean;
  renderInput: (
    entry: DataConditionEntry,
    onChange: (next: DataConditionEntry) => void
  ) => ReactNode;
  /** Renders the confirmed chip body shown next to the type label. Returns
   *  `null` if the chip only needs the type label. */
  renderConfirmedSummary: (entry: DataConditionEntry) => ReactNode;
  /** Returns the natural-language fragment used inside the preview sentence,
   *  e.g. `field "host.name" is changed`. */
  getPreviewText: (entry: DataConditionEntry) => string;
  /** Pure mapper from the UI entry to the API-shaped `SnoozeCondition` that
   *  is emitted on the schedule. */
  serialize: (entry: DataConditionEntry) => SnoozeCondition;
  /** Optional warning hook. Returns a non-null message when the descriptor
   *  detects a logically inconsistent configuration. */
  getWarning?: (context: DataConditionDescriptorContext) => string | null;
}

export interface ConditionalSnoozeSchedule {
  expiresAt?: string | null;
  conditions?: SnoozeCondition[];
  conditionOperator?: 'any' | 'all';
}
