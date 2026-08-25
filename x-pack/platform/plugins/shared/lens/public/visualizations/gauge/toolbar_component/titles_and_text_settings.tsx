/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GaugeLabelMajorMode } from '@kbn/expression-gauge-plugin/common';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import { VisLabel } from '../../../shared_components';
import type { GaugeVisualizationState } from '../constants';

type Props = VisualizationToolbarProps<GaugeVisualizationState> & {
  inputValue: GaugeVisualizationState;
  handleInputChange: (val: GaugeVisualizationState) => void;
  subtitleMode: GaugeLabelMajorMode;
  setSubtitleMode: React.Dispatch<React.SetStateAction<GaugeLabelMajorMode>>;
};
export function TitlesAndTextSettings(props: Props) {
  const { state, frame, inputValue, handleInputChange, subtitleMode, setSubtitleMode } = props;

  const metricDimensionTitle =
    state.layerId &&
    frame.activeData?.[state.layerId]?.columns.find((col) => col.id === state.metricAccessor)?.name;

  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.label.gauge.labelMajor.header', {
          defaultMessage: 'Title',
        })}
        fullWidth
      >
        <VisLabel
          header={i18n.translate('xpack.lens.label.gauge.labelMajor.header', {
            defaultMessage: 'Title',
          })}
          dataTestSubj="lnsToolbarGaugeLabelMajor"
          label={inputValue.labelMajor || ''}
          mode={inputValue.labelMajorMode}
          placeholder={metricDimensionTitle || ''}
          hasAutoOption={true}
          handleChange={(value) => {
            handleInputChange({
              ...inputValue,
              labelMajor: value.label,
              labelMajorMode: value.mode,
            });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        display="columnCompressed"
        label={i18n.translate('xpack.lens.label.gauge.labelMinor.header', {
          defaultMessage: 'Subtitle',
        })}
      >
        <VisLabel
          header={i18n.translate('xpack.lens.label.gauge.labelMinor.header', {
            defaultMessage: 'Subtitle',
          })}
          dataTestSubj="lnsToolbarGaugeLabelMinor"
          label={inputValue.labelMinor || ''}
          mode={subtitleMode}
          handleChange={(value) => {
            handleInputChange({
              ...inputValue,
              labelMinor: value.mode === 'none' ? '' : value.label,
            });
            setSubtitleMode(value.mode);
          }}
        />
      </EuiFormRow>
    </>
  );
}
