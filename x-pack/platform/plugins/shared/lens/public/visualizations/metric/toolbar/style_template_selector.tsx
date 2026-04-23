/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  euiFocusRing,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { MetricStyleTemplate } from './type';

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

function MetricPreview({ position }: { position: MetricStyleTemplate }) {
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
