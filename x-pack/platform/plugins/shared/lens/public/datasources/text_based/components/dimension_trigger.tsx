/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { DimensionTrigger } from '@kbn/visualization-ui-components';

export function TextBasedDimensionTrigger({ id, label }: { id: string; label?: string }) {
  return (
    <DimensionTrigger
      id={id}
      color={label ? 'primary' : 'danger'}
      dataTestSubj="lns-dimensionTrigger-textBased"
      label={
        label ??
        i18n.translate('xpack.lens.textBasedLanguages.missingField', {
          defaultMessage: 'Missing field',
        })
      }
    />
  );
}
