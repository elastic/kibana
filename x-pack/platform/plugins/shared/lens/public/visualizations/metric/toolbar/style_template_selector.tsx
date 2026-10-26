/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { MetricStyleTemplateId, MetricStyleTemplatePresetId } from '@kbn/lens-common';

const styleTemplateSelectorLabel = i18n.translate('xpack.lens.metric.styleTemplate.selectorLabel', {
  defaultMessage: 'Style template',
});

const customLabel = i18n.translate('xpack.lens.metric.styleTemplate.custom', {
  defaultMessage: 'Custom',
});
const styleTemplates: Array<{
  id: MetricStyleTemplateId;
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
    label: customLabel,
    preview: <CustomStyleTemplatePreview title={customLabel} />,
  },
];

const styleTemplateGridStyles = {
  gridItem: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexBasis: `calc(50% - ${euiTheme.size.xs})`,
      minWidth: `calc(50% - ${euiTheme.size.xs})`,
      maxWidth: `calc(50% - ${euiTheme.size.xs})`,
    }),
};

export function StyleTemplateSelector({
  selectedTemplate,
  onSelectTemplate,
}: {
  selectedTemplate: MetricStyleTemplateId;
  onSelectTemplate: (template: MetricStyleTemplateId) => void;
}) {
  const styles = useMemoCss(styleTemplateGridStyles);

  return (
    <div role="radiogroup" aria-label={styleTemplateSelectorLabel}>
      <EuiFlexGroup gutterSize="s" wrap>
        {styleTemplates.map(({ id, label, preview }) => (
          <EuiFlexItem key={id} css={styles.gridItem}>
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
  const isCustomTemplate = id === 'custom';

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
          transform: none;
        }
        ${isSelected
          ? `
          border: 1px solid ${euiTheme.colors.borderStrongPrimary};
          `
          : `
          border: 1px solid ${euiTheme.border.color};
          `}
      `}
    >
      {isCustomTemplate ? (
        preview
      ) : (
        <>
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
        </>
      )}
    </EuiPanel>
  );
}

function CustomStyleTemplatePreview({ title }: { title: string }) {
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      alignItems="center"
      justifyContent="center"
      responsive={false}
      css={css`
        min-height: 100px;
        text-align: center;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiText>
          <strong>{title}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          color="subdued"
          size="xs"
          css={css`
            max-width: 180px;
            margin: 0 auto;
            text-align: center;
          `}
        >
          {i18n.translate('xpack.lens.metric.styleTemplate.customPreviewSubtitle', {
            defaultMessage: 'Apply your own favorite settings',
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function MetricPreview({ position }: { position: MetricStyleTemplatePresetId }) {
  const { euiTheme } = useEuiTheme();

  const value = (fontSize: string, textAlign: 'left' | 'center' | 'right' = 'left') => (
    <EuiFlexItem grow={false}>
      <EuiText
        size="relative"
        css={css`
          font-weight: ${euiTheme.font.weight.bold};
          font-size: ${fontSize};
          line-height: 1.2;
          text-align: ${textAlign};
        `}
      >
        0,000
      </EuiText>
    </EuiFlexItem>
  );

  const title = (textAlign: 'left' | 'center' | 'right' = 'left') => (
    <EuiFlexItem grow={false}>
      <EuiText
        size="xs"
        css={css`
          text-align: ${textAlign};
        `}
      >
        Title
      </EuiText>
    </EuiFlexItem>
  );

  const secondary = (textAlign: 'left' | 'center' | 'right' = 'left') => (
    <EuiFlexItem grow={false}>
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          text-align: ${textAlign};
        `}
      >
        {'<0,000>'}
      </EuiText>
    </EuiFlexItem>
  );

  return (
    <div data-test-subj={`lens-metric-style-preview-${position}`}>
      {position === 'top' ? (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          {value(euiTheme.size.l)}
          {title()}
          {secondary()}
        </EuiFlexGroup>
      ) : position === 'middle' ? (
        <EuiFlexGroup direction="column" gutterSize="none" alignItems="center" responsive={false}>
          {title()}
          {value(euiTheme.size.l)}
          {secondary()}
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          {title()}
          {secondary('right')}
          {value(euiTheme.size.l, 'right')}
        </EuiFlexGroup>
      )}
    </div>
  );
}
