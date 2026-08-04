/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KI_OTHERS_TYPE } from '../../../common/ki_type_counts';
import { type KiType } from '../../../common/knowledge_indicators';

const KI_TYPE_LABELS: Record<KiType, string> = {
  index_metadata: i18n.translate('xpack.contextEngine.kiType.indexMetadata', {
    defaultMessage: 'Index metadata',
  }),
  document: i18n.translate('xpack.contextEngine.kiType.document', {
    defaultMessage: 'Documents',
  }),
  detection: i18n.translate('xpack.contextEngine.kiType.detection', {
    defaultMessage: 'Detections',
  }),
};

export const getKiTypeLabel = (type: string): string => {
  if (type === KI_OTHERS_TYPE) {
    return i18n.translate('xpack.contextEngine.kiType.others', {
      defaultMessage: 'Other types',
    });
  }

  if (type in KI_TYPE_LABELS) {
    return KI_TYPE_LABELS[type as KiType];
  }

  return type.replace(/_/g, ' ');
};
