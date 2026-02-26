/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiFormRow, EuiFieldText, EuiButtonGroup, EuiHorizontalRule, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { hasIcon } from '@kbn/visualization-ui-components';
import type {
  MetricVisualizationState,
  TitleFontWeight,
  PrimaryMetricFontSize,
  IconPosition,
  Alignment,
  PrimaryMetricPosition,
  MetricLayoutWithDefault,
} from '@kbn/lens-common';
import {
  LENS_METRIC_LAYOUT_BY_POSITION,
  LENS_LEGACY_METRIC_STATE_DEFAULTS,
  LENS_METRIC_STATE_DEFAULTS,
} from '@kbn/lens-common';

/** Get default layout config based on primary metric position */
const getDefaultLayoutConfig = (
  primaryMetricPosition: PrimaryMetricPosition,
  { hasMetricIcon, hasSecondaryMetric }: { hasMetricIcon: boolean; hasSecondaryMetric: boolean }
): MetricLayoutWithDefault => {
  let config = { ...LENS_METRIC_LAYOUT_BY_POSITION[primaryMetricPosition] };

  if (!hasMetricIcon) {
    const { iconAlign, ...rest } = config;
    config = rest;
  }

  if (!hasSecondaryMetric) {
    const { secondaryAlign, ...rest } = config;
    config = rest;
  }

  return config;
};

/**
 * This component contains the actual settings UI.
 * It is reused by both the Popover and the Flyout.
 */
export function MetricAppearanceSettings({
  state,
  setState,
}: {
  state: MetricVisualizationState;
  setState: (newState: MetricVisualizationState) => void;
}) {
  const hasSecondaryMetric = !!state.secondaryMetricAccessor;
  const hasMetricIcon = hasIcon(state.icon);

  const disabledStates = {
    subtitle: !!state.breakdownByAccessor,
    secondaryAlign: !hasSecondaryMetric,
    iconAlign: !hasMetricIcon,
  };

  return (
    <>
      <AppearanceOptionGroup
        title={i18n.translate('xpack.lens.metric.appearancePopover.primaryMetric.title', {
          defaultMessage: 'Primary metric',
        })}
      >
        <AppearanceOption
          label={i18n.translate('xpack.lens.metric.appearancePopover.position', {
            defaultMessage: 'Position',
          })}
          value={state.primaryPosition ?? LENS_METRIC_STATE_DEFAULTS.primaryPosition}
          options={primaryMetricPositionOptions}
          onChange={(id) => {
            setState({
              ...state,
              primaryPosition: id,
              ...getDefaultLayoutConfig(id, { hasMetricIcon, hasSecondaryMetric }),
            });
          }}
          dataTestSubj="lens-metric-appearance-primary-metric-position-btn"
        />
        <AppearanceOption
          label={i18n.translate('xpack.lens.metric.appearancePopover.alignment', {
            defaultMessage: 'Alignment',
          })}
          value={state.primaryAlign ?? LENS_METRIC_STATE_DEFAULTS.primaryAlign}
          options={alignmentOptions}
          onChange={(id) => {
            setState({
              ...state,
              primaryAlign: id,
            });
          }}
          isIconOnly
          dataTestSubj="lens-metric-appearance-primary-metric-alignment-btn"
        />
        <AppearanceOption
          label={i18n.translate('xpack.lens.metric.appearancePopover.fontSize', {
            defaultMessage: 'Font size',
          })}
          value={state.valueFontMode ?? LENS_METRIC_STATE_DEFAULTS.valueFontMode}
          options={fontSizeOptions}
          onChange={(id) => {
            setState({
              ...state,
              valueFontMode: id,
            });
          }}
          dataTestSubj="lens-metric-appearance-primary-metric-font-size-btn"
        />
      </AppearanceOptionGroup>
      <EuiHorizontalRule margin="m" />
      <AppearanceOptionGroup
        title={i18n.translate('xpack.lens.metric.appearancePopover.titleAndSubtitle.title', {
          defaultMessage: 'Title and subtitle',
        })}
      >
        <SubtitleOption
          value={state.subtitle}
          onChange={(subtitle) => {
            setState({
              ...state,
              subtitle,
            });
          }}
          isDisabled={disabledStates.subtitle}
        />
        <AppearanceOption
          label={i18n.translate('xpack.lens.metric.appearancePopover.alignment', {
            defaultMessage: 'Alignment',
          })}
          value={state.titlesTextAlign ?? LENS_METRIC_STATE_DEFAULTS.titlesTextAlign}
          options={alignmentOptions}
          onChange={(id) => {
            setState({
              ...state,
              titlesTextAlign: id,
            });
          }}
          isIconOnly
          dataTestSubj="lens-metric-appearance-title-and-subtitle-alignment-btn"
        />
        <AppearanceOption
          label={i18n.translate('xpack.lens.metric.appearancePopover.fontWeight', {
            defaultMessage: 'Font weight',
          })}
          value={state.titleWeight ?? LENS_METRIC_STATE_DEFAULTS.titleWeight}
          options={fontWeightOptions}
          onChange={(id) => {
            setState({
              ...state,
              titleWeight: id,
            });
          }}
          dataTestSubj="lens-metric-appearance-title-and-subtitle-font-weight-btn"
        />
      </AppearanceOptionGroup>
      <EuiHorizontalRule margin="m" />
      <AppearanceOptionGroup
        title={i18n.translate('xpack.lens.metric.appearancePopover.secondaryMetric.title', {
          defaultMessage: 'Secondary metric',
        })}
      >
        <AppearanceOption
          label={i18n.translate('xpack.lens.metric.appearancePopover.alignment', {
            defaultMessage: 'Alignment',
          })}
          value={state.secondaryAlign ?? LENS_METRIC_STATE_DEFAULTS.secondaryAlign}
          options={alignmentOptions}
          onChange={(id) => {
            setState({
              ...state,
              secondaryAlign: id,
            });
          }}
          isDisabled={disabledStates.secondaryAlign}
          isIconOnly
          dataTestSubj="lens-metric-appearance-secondary-metric-alignment-btn"
        />
      </AppearanceOptionGroup>
      <EuiHorizontalRule margin="m" />
      <AppearanceOptionGroup
        title={i18n.translate('xpack.lens.metric.appearancePopover.other.title', {
          defaultMessage: 'Other',
        })}
      >
        <AppearanceOption
          label={i18n.translate('xpack.lens.metric.appearancePopover.iconPosition', {
            defaultMessage: 'Icon position',
          })}
          value={state.iconAlign ?? LENS_LEGACY_METRIC_STATE_DEFAULTS.iconAlign}
          options={iconPositionOptions}
          onChange={(id) => {
            setState({
              ...state,
              iconAlign: id,
            });
          }}
          isDisabled={disabledStates.iconAlign}
          dataTestSubj="lens-metric-appearance-other-icon-position-btn"
        />
      </AppearanceOptionGroup>
    </>
  );
}

function AppearanceOptionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <EuiText size="s">
      <h4>{title}</h4>
      {children}
    </EuiText>
  );
}

function SubtitleOption({
  value = '',
  onChange,
  isDisabled,
}: {
  value?: string;
  onChange: (subtitle: string) => void;
  isDisabled: boolean;
}) {
  const { inputValue, handleInputChange } = useDebouncedValue<string>(
    { onChange, value },
    { allowFalsyValue: true }
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.metric.appearancePopover.subtitle', {
        defaultMessage: 'Subtitle',
      })}
      fullWidth
      display="columnCompressed"
      isDisabled={isDisabled}
    >
      <EuiFieldText
        compressed
        data-test-subj="lens-metric-appearance-subtitle-field"
        value={inputValue}
        onChange={({ target: { value: newValue } }) => handleInputChange(newValue)}
      />
    </EuiFormRow>
  );
}

interface AppearanceOptionProps<OptionType extends string> {
  label: string;
  value: OptionType;
  options: Array<EuiButtonGroupOptionProps & { id: OptionType }>;
  onChange: (id: OptionType) => void;
  isDisabled?: boolean;
  isIconOnly?: boolean;
  dataTestSubj?: string;
}

function AppearanceOption<OptionType extends string>({
  label,
  value,
  options,
  onChange,
  isDisabled = false,
  isIconOnly = false,
  dataTestSubj,
}: AppearanceOptionProps<OptionType>) {
  const onChangeOption = (clickedOptionId: string) => {
    // Prevent onChange method call if the option clicked is selected
    if (value !== clickedOptionId) {
      onChange(clickedOptionId as OptionType);
    }
  };

  return (
    <EuiFormRow display="columnCompressed" fullWidth label={label}>
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj={dataTestSubj}
        buttonSize="compressed"
        options={options}
        // Don't show selected option if the button group is disabled
        idSelected={isDisabled ? '' : value}
        isDisabled={isDisabled}
        onChange={onChangeOption}
        isIconOnly={isIconOnly}
      />
    </EuiFormRow>
  );
}

const alignmentOptions: Array<EuiButtonGroupOptionProps & { id: Alignment }> = [
  {
    id: 'left',
    label: i18n.translate('xpack.lens.shared.left', {
      defaultMessage: 'Left',
    }),
    iconType: 'editorAlignLeft',
  },
  {
    id: 'center',
    label: i18n.translate('xpack.lens.shared.center', {
      defaultMessage: 'Center',
    }),
    iconType: 'editorAlignCenter',
  },
  {
    id: 'right',
    label: i18n.translate('xpack.lens.shared.right', {
      defaultMessage: 'Right',
    }),
    iconType: 'editorAlignRight',
  },
];

const iconPositionOptions: Array<EuiButtonGroupOptionProps & { id: IconPosition }> = [
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

const fontWeightOptions: Array<EuiButtonGroupOptionProps & { id: TitleFontWeight }> = [
  {
    id: 'normal',
    label: i18n.translate('xpack.lens.metric.appearancePopover.regular', {
      defaultMessage: 'Regular',
    }),
  },
  {
    id: 'bold',
    label: i18n.translate('xpack.lens.metric.appearancePopover.bold', {
      defaultMessage: 'Bold',
    }),
  },
];

const fontSizeOptions: Array<EuiButtonGroupOptionProps & { id: PrimaryMetricFontSize }> = [
  {
    id: 'default',
    label: i18n.translate('xpack.lens.metric.appearancePopover.default', {
      defaultMessage: 'Default',
    }),
  },
  {
    id: 'fit',
    label: i18n.translate('xpack.lens.metric.appearancePopover.fit', {
      defaultMessage: 'Fit',
    }),
  },
];

const primaryMetricPositionOptions: Array<
  EuiButtonGroupOptionProps & {
    id: PrimaryMetricPosition;
  }
> = [
  {
    id: 'top',
    label: i18n.translate('xpack.lens.metric.appearancePopover.top', {
      defaultMessage: 'Top',
    }),
  },
  {
    id: 'bottom',
    label: i18n.translate('xpack.lens.metric.appearancePopover.bottom', {
      defaultMessage: 'Bottom',
    }),
  },
];
