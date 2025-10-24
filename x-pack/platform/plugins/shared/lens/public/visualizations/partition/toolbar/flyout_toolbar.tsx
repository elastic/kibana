/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiAccordion, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  VisualizationToolbarProps,
  LensPartitionVisualizationState as PieVisualizationState,
} from '@kbn/lens-common';
import { PARTITION_EMPTY_SIZE_RADIUS as EmptySizeRatios } from '@kbn/lens-common';
import type { ToolbarContentMap } from '../../../shared_components/flyout_toolbar';
import { FlyoutToolbar } from '../../../shared_components/flyout_toolbar';
import { PartitionAppearanceSettings } from './appearance_settings';
import { PartitionTitlesAndTextSettings } from './titles_and_text_setttings';
import { PartitionChartsMeta } from '../partition_charts_meta';

export function PartitionFlyoutToolbar(props: VisualizationToolbarProps<PieVisualizationState>) {
  const { isDisabled: hasDisabledSytleSettings } =
    PartitionChartsMeta[props.state.shape].toolbarPopover;
  const datatableToolbarContentMap: ToolbarContentMap<PieVisualizationState> = {
    style: hasDisabledSytleSettings ? undefined : PartitionStyleSettings,
  };
  return <FlyoutToolbar {...props} contentMap={datatableToolbarContentMap} />;
}

function PartitionStyleSettings(props: VisualizationToolbarProps<PieVisualizationState>) {
  const { state } = props;

  const layer = state.layers[0];
  const { emptySizeRatioOptions, isDisabled } = PartitionChartsMeta[state.shape].toolbarPopover;

  const selectedOption = emptySizeRatioOptions
    ? emptySizeRatioOptions.find(
        ({ value }) =>
          value === (state.shape === 'pie' ? 0 : layer.emptySizeRatio ?? EmptySizeRatios.SMALL)
      )
    : undefined;

  const showAppearanceSettings = emptySizeRatioOptions?.length && selectedOption;

  return (
    <>
      {showAppearanceSettings ? (
        <>
          <EuiAccordion
            id={''}
            buttonContent={i18n.translate('xpack.lens.visualization.toolbar.appearance', {
              defaultMessage: 'Appearance',
            })}
            paddingSize="s"
            initialIsOpen
          >
            <PartitionAppearanceSettings {...props} />
          </EuiAccordion>
          <EuiHorizontalRule margin="m" />
          <EuiAccordion
            id={''}
            buttonContent={i18n.translate('xpack.lens.visualization.toolbar.titlesAndText', {
              defaultMessage: 'Titles and text',
            })}
            paddingSize="s"
            initialIsOpen
            isDisabled={!!isDisabled}
            {...(!!isDisabled && { forceState: 'closed' })}
          >
            <PartitionTitlesAndTextSettings {...props} />
          </EuiAccordion>
        </>
      ) : (
        <PartitionTitlesAndTextSettings {...props} />
      )}
    </>
  );
}
