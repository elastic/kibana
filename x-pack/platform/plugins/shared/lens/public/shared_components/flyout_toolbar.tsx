/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';

import { EuiButtonGroup } from '@elastic/eui';
import type { EuiButtonGroupOptionProps, UseEuiTheme, IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiIconLegend } from '@kbn/chart-icons';

import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FlyoutContainer } from './flyout_container';
import type { VisualizationToolbarProps } from '../types';

type Options = 'legend' | 'style' | 'filters';

type ToolbarOption = EuiButtonGroupOptionProps & { id: Options; label: string };
const baseToolbarOptions: ToolbarOption[] = [
  {
    id: 'legend',
    label: i18n.translate('xpack.lens.visualization.toolbar.legend', {
      defaultMessage: 'Legend',
    }),
    iconType: EuiIconLegend as IconType,
  },
  {
    id: 'style',
    label: i18n.translate('xpack.lens.visualization.toolbar.style', {
      defaultMessage: 'Style',
    }),
    iconType: 'brush',
  },
  // TODO: Add filters
  // {
  //   id: 'filters',
  //   label: i18n.translate('xpack.lens.visualization.toolbar.filters', {
  //     defaultMessage: 'Filters',
  //   }),
  //   iconType: 'filter',
  // },
];

// A component that will be rendered as content
type ContentComponent<VisualizationState> = React.ComponentType<
  VisualizationToolbarProps<VisualizationState>
>;

// The map of options to their corresponding components
export type ContentMap<VisualizationState> = Partial<
  Record<Options, ContentComponent<VisualizationState>>
>;

interface FlyoutToolbarProps<VisualizationState>
  extends VisualizationToolbarProps<VisualizationState> {
  contentMap: ContentMap<VisualizationState>;
}

export function FlyoutToolbar<VisualizationState>({
  contentMap,
  ...flyoutContentProps
}: FlyoutToolbarProps<VisualizationState>) {
  const [isFlyoutVisible, setFlyoutVisible] = useState(false);
  const [idSelected, setIdSelected] = useState<Options | ''>('');

  // NOTE: Remove the option if it doesn not have a content
  const toolbarOptions = useMemo(
    () => baseToolbarOptions.filter((option) => !!contentMap[option.id]),
    [contentMap]
  );

  const flyoutContentStyles = useMemoCss(styles).flyoutContent;

  const flyoutTitle = idSelected
    ? toolbarOptions.find((toolbarOption) => toolbarOption.id === idSelected)?.label || ''
    : '';

  const handleOptionChange = (id: string) => {
    setIdSelected(id as Options);
    setFlyoutVisible(true);
  };

  const FlyoutContent = idSelected ? contentMap[idSelected] : null;

  return (
    <div
      css={css`
        // NOTE: Override euiAccordion styles added in LensConfigurationFlyout
        .euiAccordion {
          display: block;
        }
      `}
    >
      <EuiButtonGroup
        legend={i18n.translate('xpack.lens.visualization.toolbar.title', {
          defaultMessage: 'Toolbar options',
        })}
        options={toolbarOptions}
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
        <div id={idSelected} css={flyoutContentStyles}>
          {FlyoutContent ? <FlyoutContent {...flyoutContentProps} /> : null}
        </div>
      </FlyoutContainer>
    </div>
  );
}

const styles = {
  flyoutContent: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.base,
      height: '100%',
    }),
};
