/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MemoryType, MemoryStatus } from '@kbn/agent-builder-common';

const TYPE_COLORS: Record<MemoryType, string> = {
  semantic: 'primary',
  episodic: 'accent',
  procedural: 'success',
};

const TYPE_LABELS: Record<MemoryType, string> = {
  semantic: i18n.translate('xpack.agentBuilder.memory.type.semantic', {
    defaultMessage: 'Semantic',
  }),
  episodic: i18n.translate('xpack.agentBuilder.memory.type.episodic', {
    defaultMessage: 'Episodic',
  }),
  procedural: i18n.translate('xpack.agentBuilder.memory.type.procedural', {
    defaultMessage: 'Procedural',
  }),
};

const STATUS_COLORS: Record<MemoryStatus, string> = {
  candidate: 'hollow',
  provisional: 'warning',
  established: 'success',
  consolidated: 'primary',
  suspect: 'danger',
  deprecated: 'default',
};

const STATUS_LABELS: Record<MemoryStatus, string> = {
  candidate: i18n.translate('xpack.agentBuilder.memory.status.candidate', {
    defaultMessage: 'Candidate',
  }),
  provisional: i18n.translate('xpack.agentBuilder.memory.status.provisional', {
    defaultMessage: 'Provisional',
  }),
  established: i18n.translate('xpack.agentBuilder.memory.status.established', {
    defaultMessage: 'Established',
  }),
  consolidated: i18n.translate('xpack.agentBuilder.memory.status.consolidated', {
    defaultMessage: 'Consolidated',
  }),
  suspect: i18n.translate('xpack.agentBuilder.memory.status.suspect', {
    defaultMessage: 'Suspect',
  }),
  deprecated: i18n.translate('xpack.agentBuilder.memory.status.deprecated', {
    defaultMessage: 'Deprecated',
  }),
};

export const MemoryTypeBadge: React.FC<{ type: MemoryType }> = ({ type }) => (
  <EuiBadge color={TYPE_COLORS[type] ?? 'default'}>{TYPE_LABELS[type] ?? type}</EuiBadge>
);

export const MemoryStatusBadge: React.FC<{ status: MemoryStatus }> = ({ status }) => (
  <EuiBadge color={STATUS_COLORS[status] ?? 'default'}>{STATUS_LABELS[status] ?? status}</EuiBadge>
);

export { TYPE_LABELS, STATUS_LABELS, TYPE_COLORS, STATUS_COLORS };
