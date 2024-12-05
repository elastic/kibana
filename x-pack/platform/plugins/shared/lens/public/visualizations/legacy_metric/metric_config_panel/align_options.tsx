/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup } from '@elastic/eui';
import { LegacyMetricState } from '../../../../common/types';

export interface TitlePositionProps {
  state: LegacyMetricState;
  setState: (newState: LegacyMetricState) => void;
}

export const DEFAULT_TEXT_ALIGNMENT = 'left';

const alignButtonIcons = [
  {
    id: `left`,
    label: i18n.translate('xpack.lens.legacyMetric.alignLabel.left', {
      defaultMessage: 'Align left',
    }),
    iconType: 'editorAlignLeft',
  },
  {
    id: `center`,
    label: i18n.translate('xpack.lens.legacyMetric.alignLabel.center', {
      defaultMessage: 'Align center',
    }),
    iconType: 'editorAlignCenter',
  },
  {
    id: `right`,
    label: i18n.translate('xpack.lens.legacyMetric.alignLabel.right', {
      defaultMessage: 'Align right',
    }),
    iconType: 'editorAlignRight',
  },
];

export const AlignOptions: React.FC<TitlePositionProps> = ({ state, setState }) => {
  return (
    <EuiButtonGroup
      legend={i18n.translate('xpack.lens.legacyMetric.titleAlignLabel', {
        defaultMessage: 'Align',
      })}
      options={alignButtonIcons}
      idSelected={state.textAlign ?? DEFAULT_TEXT_ALIGNMENT}
      onChange={(id) => {
        setState({ ...state, textAlign: id as LegacyMetricState['textAlign'] });
      }}
      isIconOnly
      buttonSize="compressed"
    />
  );
};
