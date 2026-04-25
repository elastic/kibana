/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import type { GaugeLabelMajorMode } from '@kbn/expression-gauge-plugin/common';

import { useDebouncedValue } from '@kbn/visualization-utils';

import { EuiAccordion, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import { type GaugeVisualizationState } from '../constants';
import { AppearanceSettings } from './appearance_settings';
import { TitlesAndTextSettings } from './titles_and_text_settings';

type GaugeToolbarProps = VisualizationToolbarProps<GaugeVisualizationState>;

export function GaugeStyleSettings(props: GaugeToolbarProps) {
  const { state, setState } = props;

  const [subtitleMode, setSubtitleMode] = useState<GaugeLabelMajorMode>(() =>
    state.labelMinor ? 'custom' : 'none'
  );

  const { inputValue, handleInputChange } = useDebouncedValue({
    onChange: setState,
    value: state,
  });

  return (
    <>
      <EuiAccordion
        id={''}
        buttonContent={i18n.translate('xpack.lens.visualization.toolbar.appearance', {
          defaultMessage: 'Appearance',
        })}
        paddingSize="s"
        initialIsOpen
      >
        <AppearanceSettings {...props} />
      </EuiAccordion>
      <EuiHorizontalRule margin="m" />
      <EuiAccordion
        id={''}
        buttonContent={i18n.translate('xpack.lens.visualization.toolbar.titlesAndText', {
          defaultMessage: 'Titles and text',
        })}
        paddingSize="s"
        initialIsOpen
      >
        <TitlesAndTextSettings
          {...props}
          inputValue={inputValue}
          handleInputChange={handleInputChange}
          subtitleMode={subtitleMode}
          setSubtitleMode={setSubtitleMode}
        />
      </EuiAccordion>
    </>
  );
}
