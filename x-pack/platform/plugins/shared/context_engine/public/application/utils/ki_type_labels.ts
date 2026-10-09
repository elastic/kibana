/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KI_OTHERS_TYPE } from '../../../common/ki_type_counts';

export const getKiTypeLabel = (type: string): string => {
  if (type === KI_OTHERS_TYPE) {
    return i18n.translate('xpack.contextEngine.kiType.others', {
      defaultMessage: 'Other types',
    });
  }

  return type.replace(/_/g, ' ');
};
