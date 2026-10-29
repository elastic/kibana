/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { formatKiTypeLabel } from '../../../utils/ki_display';

const REFERENCE_LABELS: Record<string, string> = {
  index: i18n.translate('xpack.contextEngine.kiGraph.layer.indices', {
    defaultMessage: 'Indices',
  }),
  trace: i18n.translate('xpack.contextEngine.kiGraph.layer.traces', {
    defaultMessage: 'Traces',
  }),
  conversation: i18n.translate('xpack.contextEngine.kiGraph.layer.conversations', {
    defaultMessage: 'Conversations',
  }),
  stm: i18n.translate('xpack.contextEngine.kiGraph.layer.shortTermMemories', {
    defaultMessage: 'Short-term memories',
  }),
  ki: i18n.translate('xpack.contextEngine.kiGraph.layer.otherKis', {
    defaultMessage: 'KIs outside the graph',
  }),
};

const MEMORY_LAYER_LABELS: Record<string, string> = {
  'memory.session': i18n.translate('xpack.contextEngine.kiGraph.layer.memorySession', {
    defaultMessage: 'Long-term memory',
  }),
  'memory.short_term': i18n.translate('xpack.contextEngine.kiGraph.layer.memoryShortTerm', {
    defaultMessage: 'Short-term memory',
  }),
  'memory.entity': i18n.translate('xpack.contextEngine.kiGraph.layer.memoryEntities', {
    defaultMessage: 'Memory entities',
  }),
  'memory.fact': i18n.translate('xpack.contextEngine.kiGraph.layer.memoryFacts', {
    defaultMessage: 'Memory facts',
  }),
  'memory.relationship': i18n.translate('xpack.contextEngine.kiGraph.layer.memoryRelationships', {
    defaultMessage: 'Memory relationships',
  }),
};

/** A layer reads as its KI type family, or as the kind of thing its references point at. */
export const kiGraphLayerLabel = (group: string): string => {
  if (group.startsWith('ref:')) {
    const scheme = group.slice('ref:'.length);
    return (
      REFERENCE_LABELS[scheme] ??
      i18n.translate('xpack.contextEngine.kiGraph.layer.references', {
        defaultMessage: '{scheme} references',
        values: { scheme },
      })
    );
  }
  const label = MEMORY_LAYER_LABELS[group] ?? formatKiTypeLabel(group);
  return label.charAt(0).toUpperCase() + label.slice(1);
};
