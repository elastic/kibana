/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';

import { EuiButtonGroup, EuiFlexItem } from '@elastic/eui';
import type { EuiButtonGroupOptionProps, UseEuiTheme, IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiIconLegend } from '@kbn/chart-icons';

import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import { FlyoutContainer } from './flyout_container';

type Options = 'legend' | 'style' | 'filters';

type ToolbarOption = EuiButtonGroupOptionProps & { id: Options; label: string };
const baseToolbarOptions: ToolbarOption[] = [
  {
    id: 'legend',
    label: i18n.translate('xpack.lens.flyoutToolbar.legend.title', {
      defaultMessage: 'Legend',
    }),
    iconType: EuiIconLegend as IconType,
    toolTipContent: i18n.translate('xpack.lens.flyoutToolbar.legend.tooltip', {
      defaultMessage: 'Legend',
    }),
  },
  {
    id: 'style',
    label: i18n.translate('xpack.lens.flyoutToolbar.style.title', {
      defaultMessage: 'Style',
    }),
    iconType: 'brush',
    toolTipContent: i18n.translate('xpack.lens.flyoutToolbar.style.tooltip', {
      defaultMessage: 'Style',
    }),
  },
  // {
  //   id: 'filters',
  //   label: i18n.translate('xpack.lens.flyoutToolbar.filtersTitle', {
  //     defaultMessage: 'Filters',
  //   }),
  //   iconType: 'filter',
  //   toolTipContent: i18n.translate('xpack.lens.flyoutToolbar.filtersOptionTooltip', {
  //     defaultMessage: 'Filters',
  //   }),
  // },
];

export interface ToolbarContentMap<S> {
  style?: React.ComponentType<VisualizationToolbarProps<S>>;
  legend?: React.ComponentType<VisualizationToolbarProps<S>>;
  filters?: React.ComponentType<VisualizationToolbarProps<S>>;
}

export function FlyoutToolbar<S>({
  contentMap,
  ...flyoutContentProps
}: VisualizationToolbarProps<S> & {
  contentMap: ToolbarContentMap<S>;
}) {
  const [isFlyoutVisible, setFlyoutVisible] = useState(false);
  const [idSelected, setIdSelected] = useState<Options | ''>('');

  // Filter out toolbar options that don't have corresponding content components
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
    <EuiFlexItem
      grow={false}
      css={css`
        // NOTE: Override euiAccordion styles added in LensConfigurationFlyout
        .euiAccordion {
          display: block;
        }
      `}
    >
      <EuiButtonGroup
        legend={i18n.translate('xpack.lens.flyoutToolbar.buttonGroup.legend', {
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
        {FlyoutContent ? (
          <div id={idSelected} css={flyoutContentStyles}>
            <FlyoutContent {...flyoutContentProps} />
          </div>
        ) : null}
      </FlyoutContainer>
    </EuiFlexItem>
  );
}

const styles = {
  flyoutContent: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.base,
      height: '100%',
    }),
};
