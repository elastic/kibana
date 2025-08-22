/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiFormRow, EuiFieldText, EuiButtonGroup, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/visualization-utils';
import type { MetricStyle } from '@elastic/charts';
import type { ToolbarPopoverProps } from '../../../shared_components';
import { ToolbarPopover } from '../../../shared_components';
import type { MetricVisualizationState, ValueFontMode } from '../types';
import { metricStateDefaults } from '../constants';
import {
  PrimaryAlignmentOption,
  SecondaryAlignmentOption,
  TitlesAlignmentOption,
} from './text_alignment_options';
import { TitleWeightOption } from './title_weight_option';
import { PrimaryPositionOption } from './primary_position_option';

export interface TitlesAndTextPopoverProps {
  state: MetricVisualizationState;
  setState: (newState: MetricVisualizationState) => void;
  groupPosition?: ToolbarPopoverProps['groupPosition'];
}

/** Default config based on Primary Metric position */
const DEFAULT_LAYOUT_CONFIG: Record<
  string,
  Pick<MetricVisualizationState, 'titleWeight' | 'primaryAlign'>
> = {
  top: {
    titleWeight: 'normal',
    primaryAlign: 'left',
  },
  bottom: {
    titleWeight: 'bold',
    primaryAlign: 'right',
  },
};

const getDefaultLayoutConfig = (
  newPrimaryPosition: 'top' | 'bottom',
  hasSecondaryMetric: boolean
): Pick<MetricVisualizationState, 'titleWeight' | 'primaryAlign' | 'secondaryAlign'> => {
  return {
    ...DEFAULT_LAYOUT_CONFIG[newPrimaryPosition],
    ...(hasSecondaryMetric && newPrimaryPosition === 'top'
      ? { secondaryAlign: 'left' }
      : { secondaryAlign: 'right' }),
  };
};

export const TitlesAndTextPopover: FC<TitlesAndTextPopoverProps> = ({
  state,
  setState,
  groupPosition,
}) => {
  const hasSecondaryMetric = !!state.secondaryMetricAccessor;
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.metric.toolbarTitlesText.label', {
        defaultMessage: 'Titles and text',
      })}
      type="titlesAndText"
      groupPosition={groupPosition}
      buttonDataTestSubj="lnsTextOptionsButton"
    >
      {!state.breakdownByAccessor && (
        <SubtitleOption
          value={state.subtitle}
          onChange={(subtitle) => {
            setState({
              ...state,
              subtitle,
            });
          }}
        />
      )}

      <TitlesAlignmentOption
        value={state.titlesTextAlign ?? metricStateDefaults.titlesTextAlign}
        onChange={(newTitlesTextAlign) => {
          setState({
            ...state,
            titlesTextAlign: newTitlesTextAlign,
          });
        }}
      />

      <TitleWeightOption
        value={state.titleWeight ?? metricStateDefaults.titleWeight}
        onChange={(newTitleWeight) => {
          setState({
            ...state,
            titleWeight: newTitleWeight,
          });
        }}
      />

      <PrimaryPositionOption
        value={state.primaryPosition ?? metricStateDefaults.primaryPosition}
        onChange={(newPrimaryPosition) => {
          // Avoid changing the configuration when the position option clicked is already selected
          if (
            newPrimaryPosition === state.primaryPosition ||
            (newPrimaryPosition === 'bottom' && !state.primaryPosition)
          )
            return;
          setState({
            ...state,
            primaryPosition: newPrimaryPosition,
            ...getDefaultLayoutConfig(newPrimaryPosition, hasSecondaryMetric),
          });
        }}
      />

      {state.icon && state.icon !== 'empty' && (
        <IconAlignmentOption
          value={state.iconAlign ?? metricStateDefaults.iconAlign}
          onChange={(newIconAlign) => {
            setState({
              ...state,
              iconAlign: newIconAlign,
            });
          }}
        />
      )}

      <PrimaryAlignmentOption
        value={state.primaryAlign ?? metricStateDefaults.primaryAlign}
        onChange={(newPrimaryAlign) => {
          setState({
            ...state,
            primaryAlign: newPrimaryAlign,
          });
        }}
      />

      <ValueFontSizeOption
        value={state.valueFontMode ?? metricStateDefaults.valueFontMode}
        onChange={(value) => {
          setState({ ...state, valueFontMode: value });
        }}
      />

      {hasSecondaryMetric && (
        <SecondaryAlignmentOption
          value={state.secondaryAlign ?? metricStateDefaults.secondaryAlign}
          onChange={(newSecondaryAlign) => {
            setState({
              ...state,
              secondaryAlign: newSecondaryAlign,
            });
          }}
        />
      )}
    </ToolbarPopover>
  );
};

function SubtitleOption({
  value = '',
  onChange,
}: {
  value?: string;
  onChange: (subtitle: string) => void;
}) {
  const { inputValue, handleInputChange } = useDebouncedValue<string>(
    {
      onChange,
      value,
    },
    { allowFalsyValue: true }
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.metric.subtitleLabel', {
        defaultMessage: 'Subtitle',
      })}
      fullWidth
      display="columnCompressed"
    >
      <EuiFieldText
        compressed
        data-test-subj="lens-metric-subtitle-field"
        value={inputValue}
        onChange={({ target: { value: newValue } }) => handleInputChange(newValue)}
      />
    </EuiFormRow>
  );
}

const valueFontModes: Array<{
  id: ValueFontMode;
  label: string;
}> = [
  {
    id: 'default',
    label: i18n.translate('xpack.lens.metric.toolbarTitlesText.default', {
      defaultMessage: 'Default',
    }),
  },
  {
    id: 'fit',
    label: i18n.translate('xpack.lens.metric.toolbarTitlesText.fit', {
      defaultMessage: 'Fit',
    }),
  },
];

function ValueFontSizeOption({
  value,
  onChange,
}: {
  value: (typeof valueFontModes)[number]['id'];
  onChange: (mode: ValueFontMode) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarTitlesText.valueFontSize', {
    defaultMessage: 'Primary font size',
  });

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <span>
          {label}{' '}
          <EuiIconTip
            content={i18n.translate('xpack.lens.metric.toolbarTitlesText.valueFontSizeTip', {
              defaultMessage: 'Font size of the Primary metric value',
            })}
            iconProps={{ className: 'eui-alignTop' }}
            color="subdued"
            position="top"
            size="s"
            type="question"
          />
        </span>
      }
    >
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-value-font-mode-btn"
        buttonSize="compressed"
        idSelected={value}
        options={valueFontModes}
        onChange={(mode) => {
          onChange(mode as ValueFontMode);
        }}
      />
    </EuiFormRow>
  );
}

const iconAlignmentOptions: Array<{
  id: MetricStyle['titlesTextAlign'] | MetricStyle['valueTextAlign'];
  label: string;
}> = [
  {
    id: 'left',
    label: i18n.translate('xpack.lens.shared.left', {
      defaultMessage: 'Left',
    }),
  },
  {
    id: 'right',
    label: i18n.translate('xpack.lens.shared.right', {
      defaultMessage: 'Right',
    }),
  },
];

function IconAlignmentOption({
  value,
  onChange,
}: {
  value: MetricStyle['iconAlign'];
  onChange: (alignment: MetricStyle['iconAlign']) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarTitlesText.iconAlignment', {
    defaultMessage: 'Icon alignment',
  });

  return (
    <EuiFormRow display="columnCompressed" label={label}>
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-icon-alignment-btn"
        buttonSize="compressed"
        options={iconAlignmentOptions}
        idSelected={value}
        onChange={(alignment) => {
          onChange(alignment as MetricStyle['iconAlign']);
        }}
      />
    </EuiFormRow>
  );
}
