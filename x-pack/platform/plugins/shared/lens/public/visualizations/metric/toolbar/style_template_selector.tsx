/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiFormRow,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  euiFocusRing,
  EuiFieldText,
  EuiToolTip,
  EuiPanel,
  EuiButtonGroup,
} from '@elastic/eui';
import type {
  PrimaryMetricFontSize,
  IconPosition,
  Alignment,
  PrimaryMetricPosition,
} from '@kbn/lens-common';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/visualization-utils';
import type { MetricStyleTemplate } from './type';

export function StyleTemplateSelector({
  selectedTemplate,
  onSelectTemplate,
}: {
  selectedTemplate: MetricStyleTemplate;
  onSelectTemplate: (template: MetricStyleTemplate) => void;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <div>
      <EuiText size="s">
        <h4>
          {i18n.translate('xpack.lens.metric.appearancePopover.style.title', {
            defaultMessage: 'Style',
          })}
        </h4>
      </EuiText>
      <EuiFlexGroup
        gutterSize="s"
        wrap
        css={css`
          margin-top: ${euiTheme.size.s};
        `}
      >
        {styleTemplates.map(({ id, label, preview }) => (
          <EuiFlexItem
            key={id}
            css={css`
              flex-basis: calc(50% - ${euiTheme.size.xs});
              min-width: calc(50% - ${euiTheme.size.xs});
              max-width: calc(50% - ${euiTheme.size.xs});
            `}
          >
            <StyleTemplateCard
              id={id}
              label={label}
              preview={preview}
              isSelected={selectedTemplate === id}
              onSelect={() => onSelectTemplate(id)}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
}

function StyleTemplateCard({
  id,
  label,
  preview,
  isSelected,
  onSelect,
}: {
  id: string;
  label: string;
  preview: ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  return (
    <EuiPanel
      hasBorder={true}
      hasShadow={false}
      paddingSize="s"
      data-test-subj={`lens-metric-style-template-${id}`}
      onClick={onSelect}
      aria-checked={isSelected}
      aria-label={label}
      element="button"
      role="radio"
      color={isSelected ? 'primary' : 'subdued'}
      css={css`
        width: 100%;
        text-align: left;
        box-shadow: none !important; // sass-lint:disable-line no-important

        &:focus {
          transform: none !important; // sass-lint:disable-line no-important
          ${euiFocusRing(euiThemeContext)};
        }
        ${isSelected
          ? `
          border: 1px solid ${
            euiTheme.colors.borderStrongPrimary
          } !important; // sass-lint:disable-line no-important

          &:not(:focus) {
            box-shadow: none !important; // sass-lint:disable-line no-important
          }

          &:focus {
            ${euiFocusRing(euiThemeContext)};
          }

          &:hover {
            transform: none !important; // sass-lint:disable-line no-important
          }
          `
          : `
          border: 1px solid ${euiTheme.border.color} !important; // sass-lint:disable-line no-important
          `}
      `}
    >
      <EuiText
        size="s"
        css={css`
          margin-bottom: ${euiTheme.size.s};
        `}
      >
        <strong>{label}</strong>
      </EuiText>
      <EuiPanel hasShadow={false} hasBorder={true} paddingSize="s" color="plain">
        {preview}
      </EuiPanel>
    </EuiPanel>
  );
}

function MetricPreview({ position }: { position: 'top' | 'middle' | 'bottom' | 'custom' }) {
  const { euiTheme } = useEuiTheme();

  const value = (fontSize: string) => (
    <EuiFlexItem grow={false}>
      <EuiText
        size="relative"
        css={css`
          font-weight: ${euiTheme.font.weight.bold};
          font-size: ${fontSize};
          line-height: 1.2;
        `}
      >
        0,000
      </EuiText>
    </EuiFlexItem>
  );

  const title = (
    <EuiFlexItem grow={false}>
      <EuiText size="xs">Title</EuiText>
    </EuiFlexItem>
  );

  const secondary = (
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {'<0,000>'}
      </EuiText>
    </EuiFlexItem>
  );

  const content: Record<MetricStyleTemplate, ReactNode> = {
    top: (
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        {value(euiTheme.size.l)}
        {title}
        {secondary}
      </EuiFlexGroup>
    ),
    middle: (
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        {title}
        {value(euiTheme.size.l)}
        {secondary}
      </EuiFlexGroup>
    ),
    bottom: (
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        {title}
        {secondary}
        {value(euiTheme.size.l)}
      </EuiFlexGroup>
    ),
    custom: (
      <EuiFlexGroup direction="column" gutterSize="none" alignItems="center" responsive={false}>
        {title}
        {value(euiTheme.size.l)}
        {secondary}
      </EuiFlexGroup>
    ),
  };

  return <div data-test-subj={`lens-metric-style-preview-${position}`}>{content[position]}</div>;
}

const styleTemplates: Array<{
  id: MetricStyleTemplate;
  label: string;
  preview: ReactNode;
}> = [
  {
    id: 'top',
    label: i18n.translate('xpack.lens.metric.styleTemplate.top', { defaultMessage: 'Top' }),
    preview: <MetricPreview position="top" />,
  },
  {
    id: 'middle',
    label: i18n.translate('xpack.lens.metric.styleTemplate.middle', { defaultMessage: 'Middle' }),
    preview: <MetricPreview position="middle" />,
  },
  {
    id: 'bottom',
    label: i18n.translate('xpack.lens.metric.styleTemplate.bottom', { defaultMessage: 'Bottom' }),
    preview: <MetricPreview position="bottom" />,
  },
  {
    id: 'custom',
    label: i18n.translate('xpack.lens.metric.styleTemplate.custom', { defaultMessage: 'Custom' }),
    preview: <MetricPreview position="custom" />,
  },
];

export function AppearanceOptionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <EuiText size="s">
      <h4>{title}</h4>
      {children}
    </EuiText>
  );
}

export function SubtitleOption({
  value = '',
  onChange,
  isDisabled,
}: {
  value?: string;
  onChange: (subtitle: string) => void;
  isDisabled: boolean | string;
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
      isDisabled={!!isDisabled}
    >
      <EuiToolTip display="block" content={isDisabled}>
        <EuiFieldText
          compressed
          disabled={!!isDisabled}
          data-test-subj="lens-metric-appearance-subtitle-field"
          value={inputValue}
          onChange={({ target: { value: newValue } }) => handleInputChange(newValue)}
        />
      </EuiToolTip>
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

export function AppearanceOption<OptionType extends string>({
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

export const alignmentOptions: Array<EuiButtonGroupOptionProps & { id: Alignment }> = [
  {
    id: 'left',
    label: i18n.translate('xpack.lens.shared.left', {
      defaultMessage: 'Left',
    }),
    iconType: 'textAlignLeft',
  },
  {
    id: 'center',
    label: i18n.translate('xpack.lens.shared.center', {
      defaultMessage: 'Center',
    }),
    iconType: 'textAlignCenter',
  },
  {
    id: 'right',
    label: i18n.translate('xpack.lens.shared.right', {
      defaultMessage: 'Right',
    }),
    iconType: 'textAlignRight',
  },
];

export const iconPositionOptions: Array<EuiButtonGroupOptionProps & { id: IconPosition }> = [
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

export const fontSizeOptions: Array<EuiButtonGroupOptionProps & { id: PrimaryMetricFontSize }> = [
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

export const primaryMetricPositionOptions: Array<
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
    id: 'middle',
    label: i18n.translate('xpack.lens.metric.appearancePopover.middle', {
      defaultMessage: 'Middle',
    }),
  },
  {
    id: 'bottom',
    label: i18n.translate('xpack.lens.metric.appearancePopover.bottom', {
      defaultMessage: 'Bottom',
    }),
  },
];
