/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ValueLabelsSettings } from '../../../shared_components';
import type { XYState } from '../types';

export function XyTitlesAndTextSettings({
  state,
  setState,
}: {
  state: XYState;
  setState: (newState: XYState) => void;
}) {
  return (
    <ValueLabelsSettings
      label={i18n.translate('xpack.lens.shared.chartBarLabelVisibilityLabel', {
        defaultMessage: 'Bar values',
      })}
      valueLabels={state?.valueLabels ?? 'hide'}
      onValueLabelChange={(newMode) => {
        setState({ ...state, valueLabels: newMode });
      }}
    />
  );
}
