/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiButtonGroupOptionProps, UseEuiTheme } from '@elastic/eui';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FlyoutContainer } from '../../../shared_components/flyout_container';
import type { VisualizationToolbarProps } from '../../../types';
import { AppearanceSettings } from '../toolbar/appearance_settings';
import type { MetricVisualizationState } from '../types';

type Option = EuiButtonGroupOptionProps & { label: string };
const options: Option[] = [
  {
    id: 'appearance',
    label: i18n.translate('xpack.lens.metric.toolbar.appearanceLabel', {
      defaultMessage: 'Appearance',
    }),
    iconType: 'brush',
  },
];

const styles = {
  flyoutChildStyle: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.base,
      height: '100%',
    }),
};

export function SettingsPanelToolbar(props: VisualizationToolbarProps<MetricVisualizationState>) {
  const [isFlyoutVisible, setFlyoutVisible] = useState(false);
  const [idSelected, setIdSelected] = useState('');

  const flyoutChildStyle = useMemoCss(styles).flyoutChildStyle;

  const flyoutTitle = idSelected
    ? options.find((option) => option.id === idSelected)?.label || ''
    : '';

  const flyoutContentMap: Record<string, React.ReactNode> = {
    appearance: <AppearanceSettings state={props.state} setState={props.setState} />,
  };

  const handleOptionChange = (id: string) => {
    setIdSelected(id);
    setFlyoutVisible(true);
  };

  return (
    <>
      <EuiButtonGroup
        legend={i18n.translate('xpack.lens.metric.toolbar.optionsLegend', {
          defaultMessage: 'Toolbar Options',
        })}
        options={options}
        onChange={handleOptionChange}
        idSelected={idSelected}
        isIconOnly
      />

      <FlyoutContainer
        isFullscreen={false}
        label={flyoutTitle}
        isInlineEditing={true}
        isOpen={isFlyoutVisible}
        handleClose={() => {
          setIdSelected('');
          setFlyoutVisible(false);
        }}
      >
        <div id={idSelected} css={flyoutChildStyle}>
          {idSelected && flyoutContentMap[idSelected] !== undefined
            ? flyoutContentMap[idSelected]
            : null}
        </div>
      </FlyoutContainer>
    </>
  );
}
