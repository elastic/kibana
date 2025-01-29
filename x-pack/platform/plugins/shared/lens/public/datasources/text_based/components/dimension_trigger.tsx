/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { DimensionTrigger } from '@kbn/visualization-ui-components';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DatasourceDimensionTriggerProps } from '../../../types';
import type { TextBasedPrivateState } from '../types';

export type TextBasedDimensionTrigger = DatasourceDimensionTriggerProps<TextBasedPrivateState> & {
  columnLabelMap: Record<string, string>;
  expressions: ExpressionsStart;
};

export function TextBasedDimensionTrigger(props: TextBasedDimensionTrigger) {
  const customLabel: string | undefined = props.columnLabelMap[props.columnId];

  return (
    <DimensionTrigger
      id={props.columnId}
      color={customLabel ? 'primary' : 'danger'}
      dataTestSubj="lns-dimensionTrigger-textBased"
      label={
        customLabel ??
        i18n.translate('xpack.lens.textBasedLanguages.missingField', {
          defaultMessage: 'Missing field',
        })
      }
    />
  );
}
