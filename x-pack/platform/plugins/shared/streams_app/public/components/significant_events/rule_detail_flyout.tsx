/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { SuggestedRule } from './suggested_rules_flyout';

const IMPACT_HEALTH_COLOR: Record<SuggestedRule['impact'], string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
};

const IMPACT_LABEL: Record<SuggestedRule['impact'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
};

interface RuleDetailFlyoutProps {
  rule: SuggestedRule;
  onClose: () => void;
  /** When true renders as a standalone overlay flyout instead of a child session flyout */
  standalone?: boolean;
}

export function RuleDetailFlyout({ rule, onClose, standalone = false }: RuleDetailFlyoutProps) {
  const { euiTheme } = useEuiTheme();

  const panelStyle = css`
    border: 1px solid ${euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.small};
    padding: ${euiTheme.size.base} ${euiTheme.size.l};
  `;

  const panelTitleRowStyle = css`
    display: flex;
    align-items: center;
    min-height: 32px;
    padding-bottom: ${euiTheme.size.s};
  `;

  const attrRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.base};
    padding: ${euiTheme.size.s} 0;
    border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
    &:last-child {
      border-bottom: none;
    }
  `;

  const attrLabelStyle = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: ${euiTheme.size.m};
    color: ${euiTheme.colors.textHeading};
    min-width: 140px;
    flex-shrink: 0;
  `;

  return (
    // Rendered inside the parent EuiFlyout JSX tree — EUI auto-inherits the
    // session and positions this flyout side-by-side with the parent.
    // flyoutMenuProps.title is displayed in the child's menu bar (no EuiFlyoutHeader needed).
    // hasChildBackground gives the shaded background per EUI child flyout styling.
    // session="inherit" explicitly joins the parent's managed session.
    // size must be a named size ('s'|'m'|'l'|'fill') — EuiManagedFlyout throws
    // a validation error at render time if a child flyout uses a numeric size.
    <EuiFlyout
      {...(!standalone && {
        session: 'inherit' as const,
        flyoutMenuProps: { title: rule.name, titleId: 'ruleDetailFlyoutTitle' },
        hasChildBackground: true,
      })}
      {...(standalone && {
        type: 'push' as const,
        pushMinBreakpoint: 'xs' as const,
        size: 's' as const,
      })}
      onClose={onClose}
      size={standalone ? 's' : 'm'}
      aria-labelledby="ruleDetailFlyoutTitle"
      data-test-subj="streamsSignificantEventsRuleDetailFlyout"
    >
      {standalone && (
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="ruleDetailFlyoutTitle">{rule.name}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
      )}
      <EuiFlyoutBody>
        {/* Summary panel */}
        <div css={panelStyle}>
          <div css={panelTitleRowStyle}>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.streams.significantEvents.ruleDetail.summary', {
                  defaultMessage: 'Summary',
                })}
              </h3>
            </EuiTitle>
          </div>
          <EuiText size="s">
            <p
              css={css`
                white-space: pre-line;
              `}
            >
              {rule.summary}
            </p>
          </EuiText>
        </div>

        <EuiSpacer size="m" />

        {/* General information panel */}
        <div css={panelStyle}>
          <div css={panelTitleRowStyle}>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.streams.significantEvents.ruleDetail.generalInfo', {
                  defaultMessage: 'General information',
                })}
              </h3>
            </EuiTitle>
          </div>

          <div>
            <div css={attrRowStyle}>
              <span css={attrLabelStyle}>
                {i18n.translate('xpack.streams.significantEvents.ruleDetail.titleLabel', {
                  defaultMessage: 'Title',
                })}
              </span>
              <EuiText size="s">
                <span>{rule.name}</span>
              </EuiText>
            </div>

            <div css={attrRowStyle}>
              <span css={attrLabelStyle}>
                {i18n.translate('xpack.streams.significantEvents.ruleDetail.typeLabel', {
                  defaultMessage: 'Type',
                })}
              </span>
              <EuiBadge>{rule.type}</EuiBadge>
            </div>

            <div css={attrRowStyle}>
              <span css={attrLabelStyle}>
                {i18n.translate('xpack.streams.significantEvents.ruleDetail.impactLabel', {
                  defaultMessage: 'Impact',
                })}
              </span>
              <EuiHealth color={IMPACT_HEALTH_COLOR[rule.impact]}>
                {IMPACT_LABEL[rule.impact]}
              </EuiHealth>
            </div>

            <div css={attrRowStyle}>
              <span css={attrLabelStyle}>
                {i18n.translate('xpack.streams.significantEvents.ruleDetail.streamLabel', {
                  defaultMessage: 'Stream',
                })}
              </span>
              <EuiBadge color="hollow">{rule.stream}</EuiBadge>
            </div>

            <div css={attrRowStyle}>
              <span css={attrLabelStyle}>
                {i18n.translate(
                  'xpack.streams.significantEvents.ruleDetail.knowledgeIndicatorsLabel',
                  { defaultMessage: 'Knowledge indicators' }
                )}
              </span>
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {rule.knowledgeIndicators.map((indicator) => (
                  <EuiFlexItem key={indicator} grow={false}>
                    <EuiBadge color="hollow">{indicator}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </div>
          </div>
        </div>

        <EuiSpacer size="m" />

        {/* Query information panel */}
        <div css={panelStyle}>
          <div css={panelTitleRowStyle}>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.streams.significantEvents.ruleDetail.queryInfo', {
                  defaultMessage: 'Query information',
                })}
              </h3>
            </EuiTitle>
          </div>
          <EuiCodeBlock language="esql" fontSize="m" paddingSize="m" isCopyable>
            {rule.query}
          </EuiCodeBlock>
        </div>

        <EuiSpacer size="m" />

        {/* Raw document panel */}
        <div css={panelStyle}>
          <div css={panelTitleRowStyle}>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.streams.significantEvents.ruleDetail.rawDocument', {
                  defaultMessage: 'Raw document',
                })}
              </h3>
            </EuiTitle>
          </div>
          <EuiCodeBlock language="text" fontSize="m" paddingSize="m" isCopyable>
            {rule.rawDocument}
          </EuiCodeBlock>
        </div>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
