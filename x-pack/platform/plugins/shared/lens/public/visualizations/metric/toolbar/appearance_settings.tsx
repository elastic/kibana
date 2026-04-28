/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiAccordion, EuiFormRow, EuiHorizontalRule } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { hasIcon, IconSelect } from '@kbn/visualization-ui-components';
import type {
  MetricLayoutWithDefault,
  MetricVisualizationState,
  MetricStyleTemplateId,
  MetricStyleTemplatePresetId,
} from '@kbn/lens-common';
import {
  LENS_LEGACY_METRIC_STATE_DEFAULTS,
  LENS_METRIC_STATE_DEFAULTS,
  LENS_METRIC_STYLE_TEMPLATE,
} from '@kbn/lens-common';

import { metricIconsSet } from '../../../shared_components/icon_set';
import { AppearanceOption, AppearanceOptionGroup, SubtitleOption } from './appearance_option';
import {
  alignmentOptions,
  fontSizeOptions,
  iconPositionOptions,
  primaryMetricPositionOptions,
} from './option_configs';
import { StyleTemplateSelector } from './style_template_selector';

const getDefaultLayoutConfig = (
  primaryMetricPosition: MetricStyleTemplatePresetId,
  { hasMetricIcon, hasSecondaryMetric }: { hasMetricIcon: boolean; hasSecondaryMetric: boolean }
): MetricLayoutWithDefault => {
  let config: MetricLayoutWithDefault = { ...LENS_METRIC_STYLE_TEMPLATE[primaryMetricPosition] };

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

const applyIconChange = (
  state: MetricVisualizationState,
  newIcon: string
): MetricVisualizationState | null => {
  if (state.icon === newIcon) return null;

  if (newIcon === 'empty') {
    const { icon, iconAlign, ...rest } = state;
    return { ...rest };
  }

  if (state.icon && state.iconAlign) {
    return { ...state, icon: newIcon };
  }

  return {
    ...state,
    icon: newIcon,
    // Use legacy default when the icon previously existed without an explicit align (legacy state),
    // otherwise use the current default for a fresh icon selection.
    iconAlign: state.icon
      ? LENS_LEGACY_METRIC_STATE_DEFAULTS.iconAlign
      : LENS_METRIC_STATE_DEFAULTS.iconAlign,
  };
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
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const hasSecondaryMetric = !!state.secondaryMetricAccessor;
  const hasMetricIcon = hasIcon(state.icon);
  const selectedTemplateLayout =
    state.styleTemplate && state.styleTemplate !== 'custom'
      ? LENS_METRIC_STYLE_TEMPLATE[state.styleTemplate]
      : undefined;

  const disabledStates = {
    subtitle:
      !!state.breakdownByAccessor &&
      i18n.translate('xpack.lens.metric.appearancePopover.subtitle.tooltip', {
        defaultMessage: 'Not supported with break down by',
      }),
    secondaryAlign: !hasSecondaryMetric,
    iconAlign: !hasMetricIcon,
  } satisfies Record<string, boolean | string>;

  const selectedTemplate: MetricStyleTemplateId = state.styleTemplate ?? 'custom';

  return (
    <>
      <StyleTemplateSelector
        selectedTemplate={selectedTemplate}
        onSelectTemplate={(template) => {
          if (template === 'custom') {
            setIsDetailsOpen(true);
            setState({ ...state, styleTemplate: 'custom' });
            return;
          }

          setState({
            ...state,
            styleTemplate: template,
            ...getDefaultLayoutConfig(template, { hasMetricIcon, hasSecondaryMetric }),
          });
        }}
      />
      <EuiHorizontalRule margin="m" />
      <EuiAccordion
        id="lens-metric-appearance-details"
        buttonContent={i18n.translate('xpack.lens.metric.appearancePopover.details', {
          defaultMessage: 'Details',
        })}
        forceState={isDetailsOpen ? 'open' : 'closed'}
        onToggle={setIsDetailsOpen}
        data-test-subj="lens-metric-appearance-details-accordion"
      >
        <div
          css={css`
            padding-top: 8px;
          `}
        >
          <AppearanceOptionGroup
            title={i18n.translate('xpack.lens.metric.appearancePopover.primaryMetric.title', {
              defaultMessage: 'Primary metric',
            })}
          >
            <AppearanceOption
              label={i18n.translate('xpack.lens.metric.appearancePopover.position', {
                defaultMessage: 'Position',
              })}
              value={
                (state.styleTemplate !== 'custom' ? state.styleTemplate : undefined) ??
                state.primaryPosition ??
                LENS_METRIC_STATE_DEFAULTS.primaryPosition
              }
              options={primaryMetricPositionOptions}
              onChange={(id) => {
                setState({ ...state, primaryPosition: id, styleTemplate: 'custom' });
              }}
              dataTestSubj="lens-metric-appearance-primary-metric-position-btn"
            />
            <AppearanceOption
              label={i18n.translate('xpack.lens.metric.appearancePopover.alignment', {
                defaultMessage: 'Alignment',
              })}
              value={
                selectedTemplateLayout?.primaryAlign ??
                state.primaryAlign ??
                LENS_METRIC_STATE_DEFAULTS.primaryAlign
              }
              options={alignmentOptions}
              onChange={(id) => {
                setState({ ...state, primaryAlign: id, styleTemplate: 'custom' });
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
                setState({ ...state, valueFontMode: id, styleTemplate: 'custom' });
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
                setState({ ...state, subtitle, styleTemplate: 'custom' });
              }}
              isDisabled={disabledStates.subtitle}
            />
            <AppearanceOption
              label={i18n.translate('xpack.lens.metric.appearancePopover.alignment', {
                defaultMessage: 'Alignment',
              })}
              value={
                selectedTemplateLayout?.titlesTextAlign ??
                state.titlesTextAlign ??
                LENS_METRIC_STATE_DEFAULTS.titlesTextAlign
              }
              options={alignmentOptions}
              onChange={(id) => {
                setState({ ...state, titlesTextAlign: id, styleTemplate: 'custom' });
              }}
              isIconOnly
              dataTestSubj="lens-metric-appearance-title-and-subtitle-alignment-btn"
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
              value={
                selectedTemplateLayout?.secondaryAlign ??
                state.secondaryAlign ??
                LENS_METRIC_STATE_DEFAULTS.secondaryAlign
              }
              options={alignmentOptions}
              onChange={(id) => {
                setState({ ...state, secondaryAlign: id, styleTemplate: 'custom' });
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
            {/* Duplicate setting from dimension editor */}
            <EuiFormRow
              display="columnCompressed"
              fullWidth
              label={i18n.translate('xpack.lens.metric.icon', {
                defaultMessage: 'Icon decoration',
              })}
            >
              <IconSelect
                customIconSet={metricIconsSet}
                value={state?.icon}
                onChange={(newIcon) => {
                  const newState = applyIconChange(state, newIcon);
                  if (newState) {
                    setState({ ...newState, styleTemplate: 'custom' });
                  }
                }}
              />
            </EuiFormRow>
            <AppearanceOption
              label={i18n.translate('xpack.lens.metric.appearancePopover.iconPosition', {
                defaultMessage: 'Icon position',
              })}
              value={
                selectedTemplateLayout?.iconAlign ??
                state.iconAlign ??
                LENS_LEGACY_METRIC_STATE_DEFAULTS.iconAlign
              }
              options={iconPositionOptions}
              onChange={(id) => {
                setState({ ...state, iconAlign: id, styleTemplate: 'custom' });
              }}
              isDisabled={disabledStates.iconAlign}
              dataTestSubj="lens-metric-appearance-other-icon-position-btn"
            />
          </AppearanceOptionGroup>
        </div>
      </EuiAccordion>
    </>
  );
}
