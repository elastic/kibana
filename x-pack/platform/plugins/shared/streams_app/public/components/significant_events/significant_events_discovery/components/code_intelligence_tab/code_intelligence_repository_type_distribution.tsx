/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface RepositoryTypeCount {
  type: string;
  count: number;
}

interface Props {
  repositoryTypes: RepositoryTypeCount[];
}

/**
 * Compact stat view of the repository classifications identified across the
 * code-derived Knowledge Indicators (application / infrastructure as code /
 * both) — one {@link EuiStat} per identified classification.
 */
export function CodeIntelligenceRepositoryTypeDistribution({ repositoryTypes }: Props) {
  const { euiTheme } = useEuiTheme();
  const hasData = repositoryTypes.length > 0;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiTitle size="xs">
        <h3>{TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {SUBTITLE}
      </EuiText>

      {hasData ? (
        <EuiFlexGroup gutterSize="l" responsive={false} wrap css={{ marginTop: euiTheme.size.m }}>
          {repositoryTypes.map(({ type, count }) => (
            <EuiFlexItem grow={false} key={type}>
              <EuiStat
                title={<span style={{ fontFamily: euiTheme.font.familyCode }}>{count}</span>}
                description={type}
                titleSize="m"
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : (
        <EuiText size="xs" color="subdued" css={{ marginTop: euiTheme.size.m }}>
          {EMPTY_LABEL}
        </EuiText>
      )}
    </EuiPanel>
  );
}

const TITLE = i18n.translate('xpack.streams.codeIntelligenceTab.repositoryTypes.title', {
  defaultMessage: 'Repository types',
});
const SUBTITLE = i18n.translate('xpack.streams.codeIntelligenceTab.repositoryTypes.subtitle', {
  defaultMessage: 'How ingested repositories were classified',
});
const EMPTY_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.repositoryTypes.empty', {
  defaultMessage: 'No repository types identified yet.',
});
