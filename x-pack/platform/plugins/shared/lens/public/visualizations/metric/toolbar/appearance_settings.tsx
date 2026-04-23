/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiFormRow, EuiHorizontalRule, EuiAccordion } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { hasIcon, IconSelect } from '@kbn/visualization-ui-components';
import type {
  MetricVisualizationState,
  PrimaryMetricPosition,
  MetricLayoutWithDefault,
} from '@kbn/lens-common';
import {
  LENS_METRIC_STYLE_TEMPLATE,
  LENS_LEGACY_METRIC_STATE_DEFAULTS,
  LENS_METRIC_STATE_DEFAULTS,
} from '@kbn/lens-common';

import { metricIconsSet } from '../../../shared_components/icon_set';
import type { MetricStyleTemplate } from './type';
import {
  AppearanceOption,
  AppearanceOptionGroup,
  StyleTemplateSelector,
  primaryMetricPositionOptions,
  alignmentOptions,
  fontSizeOptions,
  iconPositionOptions,
  SubtitleOption,
} from './style_template_selector';

/** Get default layout config based on primary metric position */
const getDefaultLayoutConfig = (
  primaryMetricPosition: PrimaryMetricPosition,
  { hasMetricIcon, hasSecondaryMetric }: { hasMetricIcon: boolean; hasSecondaryMetric: boolean }
): MetricLayoutWithDefault => {
  let config = { ...LENS_METRIC_STYLE_TEMPLATE[primaryMetricPosition] };

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
    subtitle:
      !!state.breakdownByAccessor &&
      i18n.translate('xpack.lens.metric.appearancePopover.subtitle.tooltip', {
        defaultMessage: 'Not supported with break down by',
      }),
    secondaryAlign: !hasSecondaryMetric,
    iconAlign: !hasMetricIcon,
  } satisfies Record<string, boolean | string>;

  const currentPosition = state.primaryPosition ?? LENS_METRIC_STATE_DEFAULTS.primaryPosition;
  const [selectedTemplate, setSelectedTemplate] = useState<MetricStyleTemplate>(currentPosition);

  return (
    <>
      <StyleTemplateSelector
        selectedTemplate={selectedTemplate}
        onSelectTemplate={(template) => {
          setSelectedTemplate(template);
          if (template !== 'custom') {
            setState({
              ...state,
              primaryPosition: template,
              ...getDefaultLayoutConfig(template, { hasMetricIcon, hasSecondaryMetric }),
            });
          }
        }}
      />
      <EuiHorizontalRule margin="m" />
      <EuiAccordion
        id="lens-metric-appearance-details"
        buttonContent={i18n.translate('xpack.lens.metric.appearancePopover.details', {
          defaultMessage: 'Details',
        })}
        initialIsOpen={false}
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
              value={state.primaryPosition ?? LENS_METRIC_STATE_DEFAULTS.primaryPosition}
              options={primaryMetricPositionOptions}
              onChange={(id) => {
                setSelectedTemplate('custom');
                setState({
                  ...state,
                  primaryPosition: id,
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
                setSelectedTemplate('custom');
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
                setSelectedTemplate('custom');
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
                setSelectedTemplate('custom');
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
                setSelectedTemplate('custom');
                setState({
                  ...state,
                  titlesTextAlign: id,
                });
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
              value={state.secondaryAlign ?? LENS_METRIC_STATE_DEFAULTS.secondaryAlign}
              options={alignmentOptions}
              onChange={(id) => {
                setSelectedTemplate('custom');
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
                  if (state.icon === newIcon) return;
                  setSelectedTemplate('custom');

                  if (newIcon === 'empty') {
                    const { icon, iconAlign, ...restState } = state;
                    setState({ ...restState });
                    return;
                  }

                  if (state.icon && state.iconAlign) {
                    setState({
                      ...state,
                      icon: newIcon,
                    });
                    return;
                  }

                  if (state.icon && !state.iconAlign) {
                    setState({
                      ...state,
                      icon: newIcon,
                      iconAlign: LENS_LEGACY_METRIC_STATE_DEFAULTS.iconAlign,
                    });
                    return;
                  }

                  setState({
                    ...state,
                    icon: newIcon,
                    iconAlign: LENS_METRIC_STATE_DEFAULTS.iconAlign,
                  });
                }}
              />
            </EuiFormRow>
            <AppearanceOption
              label={i18n.translate('xpack.lens.metric.appearancePopover.iconPosition', {
                defaultMessage: 'Icon position',
              })}
              value={state.iconAlign ?? LENS_LEGACY_METRIC_STATE_DEFAULTS.iconAlign}
              options={iconPositionOptions}
              onChange={(id) => {
                setSelectedTemplate('custom');
                setState({
                  ...state,
                  iconAlign: id,
                });
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
