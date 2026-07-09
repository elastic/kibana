/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  codeOnly: number;
  both: number;
  logsOnly: number;
}

/**
 * Compact "service coverage" visualization: a single proportional stacked bar
 * (code only / code & logs / logs only) with a legend of counts. Shows how the
 * services discovered from code overlap with those observed in logs.
 */
export function CodeIntelligenceServiceDistribution({ codeOnly, both, logsOnly }: Props) {
  const { euiTheme } = useEuiTheme();
  const total = codeOnly + both + logsOnly;

  const segments = [
    {
      key: 'code',
      label: CODE_ONLY_LABEL,
      count: codeOnly,
      color: '#FDDDE9',
    },
    { key: 'both', label: BOTH_LABEL, count: both, color: euiTheme.colors.backgroundLightSuccess },
    {
      key: 'logs',
      label: LOGS_ONLY_LABEL,
      count: logsOnly,
      color: euiTheme.colors.vis.euiColorVis9,
    },
  ];

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiTitle size="xxs">
        <h3>{TITLE}</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {SUBTITLE}
      </EuiText>
      <div
        css={css`
          display: flex;
          margin-top: ${euiTheme.size.s};
          height: 12px;
          border-radius: ${euiTheme.border.radius.small};
          overflow: hidden;
          background-color: ${euiTheme.colors.lightShade};
        `}
      >
        {total > 0 &&
          segments
            .filter((segment) => segment.count > 0)
            .map((segment) => (
              <div
                key={segment.key}
                title={`${segment.label}: ${segment.count}`}
                css={css`
                  flex-grow: ${segment.count};
                  flex-basis: 0;
                  background-color: ${segment.color};
                  height: 100%;
                `}
              />
            ))}
      </div>
      <EuiFlexGroup gutterSize="l" responsive={false} wrap css={{ marginTop: euiTheme.size.s }}>
        {segments.map((segment) => (
          <EuiFlexItem grow={false} key={segment.key}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <span
                  css={css`
                    display: inline-block;
                    width: 10px;
                    height: 10px;
                    border-radius: 2px;
                    background-color: ${segment.color};
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>{segment.count}</strong> {segment.label}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const TITLE = i18n.translate('xpack.streams.codeIntelligenceTab.distribution.title', {
  defaultMessage: 'Service coverage',
});
const SUBTITLE = i18n.translate('xpack.streams.codeIntelligenceTab.distribution.subtitle', {
  defaultMessage: 'Services discovered in code vs. observed in logs',
});
const CODE_ONLY_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.distribution.codeOnly', {
  defaultMessage: 'Code only',
});
const BOTH_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.distribution.both', {
  defaultMessage: 'Code + logs',
});
const LOGS_ONLY_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.distribution.logsOnly', {
  defaultMessage: 'Logs only',
});
