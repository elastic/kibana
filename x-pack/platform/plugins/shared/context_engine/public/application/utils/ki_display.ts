/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MEMORY_KI_TYPE_PREFIX, isMemoryKiType } from '../../../common/memory';

export const noneValueLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.noneValue', {
  defaultMessage: 'None',
});

const humanize = (value: string): string => value.replace(/[._]/g, ' ');

const SESSION_MEMORY_LABELS: Record<string, string> = {
  'memory.session_fact': i18n.translate('xpack.contextEngine.kiType.memorySessionFact', {
    defaultMessage: 'long-term memory (fact)',
  }),
  'memory.session': i18n.translate('xpack.contextEngine.kiType.memorySession', {
    defaultMessage: 'long-term memory (session)',
  }),
};

/** `memory.entity.service` reads as "long-term memory (entity: service)". */
const formatMemoryTypeLabel = (type: string): string => {
  const sessionLabel = SESSION_MEMORY_LABELS[type];
  if (sessionLabel) {
    return sessionLabel;
  }
  const [category, ...kind] = type.slice(MEMORY_KI_TYPE_PREFIX.length).split('.');
  // Agent Builder's per-user memories, stored in the Elastic AI index.
  if (category === 'short_term') {
    return i18n.translate('xpack.contextEngine.kiType.memoryShortTerm', {
      defaultMessage: 'short-term memory ({kind})',
      values: { kind: humanize(kind.join('.')) },
    });
  }
  return i18n.translate('xpack.contextEngine.kiType.memoryStructured', {
    defaultMessage: 'long-term memory ({detail})',
    values: {
      detail:
        kind.length > 0 ? `${humanize(category)}: ${humanize(kind.join('.'))}` : humanize(category),
    },
  });
};

export const formatKiTypeLabel = (type: string): string =>
  isMemoryKiType(type) ? formatMemoryTypeLabel(type) : humanize(type);
