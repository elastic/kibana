/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

/**
 * Explains how the ES|QL query is split into BASE vs CONDITION for Alerting V2,
 * with legend colors aligned to the Discover editor (primary for BASE, accent for CONDITION).
 */
export function EsqlQuerySplitLegend() {
  const { euiTheme } = useEuiTheme();

  const titleStyle = (color: string) => css`
    font-size: 8pt;
    line-height: 1.2;
    font-weight: ${euiTheme.font.weight.bold};
    letter-spacing: 0.04em;
    color: ${color};
  `;

  const LegendRow = ({
    borderColor,
    fillColor,
    titleColor,
    title,
    description,
  }: {
    borderColor: string;
    fillColor: string;
    titleColor: string;
    title: string;
    description: string;
  }) => (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      <EuiFlexItem grow={false}>
        <div
          aria-hidden
          css={css`
            width: ${euiTheme.size.s};
            min-height: ${euiTheme.size.xl};
            border-radius: ${euiTheme.border.radius.small};
            border-left: ${euiTheme.border.width.thick} solid ${borderColor};
            background-color: ${fillColor};
            flex-shrink: 0;
          `}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs" color="default">
          <span css={titleStyle(titleColor)}>{title}</span>
          {' — '}
          {description}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <div data-test-subj="alertingV2EsqlQuerySplitLegend">
      <EuiText size="xs" color="default">
        <p>
          {i18n.translate('xpack.alertingV2.ruleForm.esqlLegendIntro', {
            defaultMessage:
              'Build and refine your alerting rule directly in Discover. Your query is automatically split into:',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <LegendRow
        borderColor={euiTheme.colors.borderStrongPrimary}
        fillColor={euiTheme.colors.backgroundLightPrimary}
        titleColor={euiTheme.colors.primaryText}
        title={i18n.translate('xpack.alertingV2.ruleForm.esqlLegendBaseTitle', {
          defaultMessage: 'BASE',
        })}
        description={i18n.translate('xpack.alertingV2.ruleForm.esqlLegendBaseDescription', {
          defaultMessage:
            'Defines groups and values (everything before the alert WHERE clause), so you can view what exists',
        })}
      />
      <EuiSpacer size="xs" />
      <LegendRow
        borderColor={euiTheme.colors.borderStrongAccent}
        fillColor={euiTheme.colors.backgroundLightAccent}
        titleColor={euiTheme.colors.accentText}
        title={i18n.translate('xpack.alertingV2.ruleForm.esqlLegendConditionTitle', {
          defaultMessage: 'CONDITION',
        })}
        description={i18n.translate('xpack.alertingV2.ruleForm.esqlLegendConditionDescription', {
          defaultMessage:
            'The alert filter (usually the last WHERE clause). It controls when the rule runs for each group.',
        })}
      />
      <EuiSpacer size="s" />
      <EuiText size="xs" color="default">
        <p>
          {i18n.translate('xpack.alertingV2.ruleForm.esqlLegendFooter', {
            defaultMessage:
              "A smart initial split is applied, but you're always in control. If needed, adjust CONDITION directly in the editor using right click actions.",
          })}
        </p>
      </EuiText>
    </div>
  );
}
