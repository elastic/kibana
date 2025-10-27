/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiAccordion, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import type { ToolbarContentMap } from '../../../shared_components/flyout_toolbar';
import { FlyoutToolbar } from '../../../shared_components/flyout_toolbar';
import type { HeatmapVisualizationState } from '../types';
import {
  HeatmapHorizontalAxisSettings,
  HeatmapTitlesAndTextSettings,
  HeatmapVerticalAxisSettings,
} from './style_settings';
import { HeatmapLegendSettings } from './legend_settings';

export function HeatmapFlyoutToolbar(props: VisualizationToolbarProps<HeatmapVisualizationState>) {
  const datatableToolbarContentMap: ToolbarContentMap<HeatmapVisualizationState> = {
    style: HeatmapStyleSettings,
    legend: HeatmapLegendSettings,
  };
  return <FlyoutToolbar {...props} contentMap={datatableToolbarContentMap} />;
}

function HeatmapStyleSettings(props: VisualizationToolbarProps<HeatmapVisualizationState>) {
  return (
    <>
      <EuiAccordion
        id={''}
        buttonContent={i18n.translate('xpack.lens.visualization.toolbar.titlesAndText', {
          defaultMessage: 'Titles and text',
        })}
        paddingSize="s"
        initialIsOpen
      >
        <HeatmapTitlesAndTextSettings {...props} />
      </EuiAccordion>
      <EuiHorizontalRule margin="m" />
      <EuiAccordion
        id={''}
        buttonContent={i18n.translate('xpack.lens.visualization.toolbar.verticalAxis', {
          defaultMessage: 'Vertical axis',
        })}
        paddingSize="s"
        initialIsOpen
      >
        <HeatmapVerticalAxisSettings {...props} />
      </EuiAccordion>
      <EuiHorizontalRule margin="m" />
      <EuiAccordion
        id={''}
        buttonContent={i18n.translate('xpack.lens.visualization.toolbar.horizontalAxis', {
          defaultMessage: 'Horizontal axis',
        })}
        paddingSize="s"
        initialIsOpen
      >
        <HeatmapHorizontalAxisSettings {...props} />
      </EuiAccordion>
    </>
  );
}
