/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { GaugeLabelMajorMode } from '@kbn/expression-gauge-plugin/common';

import { useDebouncedValue } from '@kbn/visualization-utils';

import type { VisualizationToolbarProps } from '@kbn/lens-common';
import { ToolbarPopover } from '../../../shared_components';
import { type GaugeVisualizationState } from '../constants';
import { AppearanceSettings } from './appearance_settings';
import { TitlesAndTextSettings } from './titles_and_text_settings';

/**
 * TODO: Remove this file after migration to flyout toolbar
 * See: https://github.com/elastic/kibana/issues/240088
 */

export const GaugeToolbar = memo((props: VisualizationToolbarProps<GaugeVisualizationState>) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <AppearancePopover {...props} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TitlesAndTextPopover {...props} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

const AppearancePopover = (props: VisualizationToolbarProps<GaugeVisualizationState>) => {
  const { state, setState } = props;

  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.gauge.appearanceLabel', {
        defaultMessage: 'Appearance',
      })}
      type="visualOptions"
      buttonDataTestSubj="lnsVisualOptionsButton"
      panelStyle={{
        width: '500px',
      }}
      data-test-subj="lnsVisualOptionsPopover"
    >
      <AppearanceSettings state={state} setState={setState} />
    </ToolbarPopover>
  );
};

const TitlesAndTextPopover = (props: VisualizationToolbarProps<GaugeVisualizationState>) => {
  const { state, setState } = props;

  const [subtitleMode, setSubtitleMode] = useState<GaugeLabelMajorMode>(() =>
    state.labelMinor ? 'custom' : 'none'
  );

  const { inputValue, handleInputChange } = useDebouncedValue({
    onChange: setState,
    value: state,
  });

  return (
    <ToolbarPopover
      handleClose={() => {
        setSubtitleMode(inputValue.labelMinor ? 'custom' : 'none');
      }}
      title={i18n.translate('xpack.lens.gauge.appearanceLabel', {
        defaultMessage: 'Titles and text',
      })}
      type="titlesAndText"
      buttonDataTestSubj="lnsTextOptionsButton"
      panelStyle={{
        width: '500px',
      }}
      data-test-subj="lnsTextOptionsPopover"
    >
      <TitlesAndTextSettings
        {...props}
        inputValue={inputValue}
        handleInputChange={handleInputChange}
        subtitleMode={subtitleMode}
        setSubtitleMode={setSubtitleMode}
      />
    </ToolbarPopover>
  );
};
