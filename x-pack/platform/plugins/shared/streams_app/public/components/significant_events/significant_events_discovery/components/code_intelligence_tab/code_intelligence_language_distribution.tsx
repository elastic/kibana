/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Chart, Partition, PartitionLayout, Settings } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  euiPaletteColorBlind,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

export interface LanguageCount {
  language: string;
  count: number;
}

interface Props {
  languages: LanguageCount[];
}

/**
 * Donut visualization of the programming languages identified across the
 * code-derived Knowledge Indicators, with a legend of per-language counts. Sits
 * next to the service-coverage bar in the Code Intelligence tab.
 */
export function CodeIntelligenceLanguageDistribution({ languages }: Props) {
  const { euiTheme } = useEuiTheme();
  const baseTheme = useElasticChartsTheme();

  const colorByLanguage = useMemo(() => {
    const palette = euiPaletteColorBlind({
      rotations: Math.max(1, Math.ceil(languages.length / 10)),
    });
    const map = new Map<string, string>();
    languages.forEach(({ language }, index) => {
      map.set(language, palette[index % palette.length]);
    });
    return map;
  }, [languages]);

  const hasData = languages.length > 0;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiTitle size="xs">
        <h3>{TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {SUBTITLE}
      </EuiText>
      <EuiSpacer size="m" />

      {hasData ? (
        <>
          <Chart size={{ height: 140 }}>
            <Settings
              baseTheme={baseTheme}
              theme={{
                partition: {
                  emptySizeRatio: 0.6,
                  linkLabel: { maxCount: 0 },
                  // Labels live in the legend below, not on the slices.
                  fillLabel: { textColor: 'rgba(0,0,0,0)' },
                },
              }}
              locale={i18n.getLocale()}
            />
            <Partition<LanguageCount>
              id="codeIntelligenceLanguageDistribution"
              data={languages}
              layout={PartitionLayout.sunburst}
              valueAccessor={(d) => d.count}
              layers={[
                {
                  groupByRollup: (d: LanguageCount) => d.language,
                  shape: {
                    fillColor: (dataName) =>
                      colorByLanguage.get(String(dataName)) ?? euiTheme.colors.lightShade,
                  },
                },
              ]}
            />
          </Chart>
          <EuiFlexGroup gutterSize="s" responsive={false} wrap css={{ marginTop: euiTheme.size.l }}>
            {languages.map(({ language, count }) => (
              <EuiFlexItem grow={false} key={language}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <span
                      css={css`
                        display: inline-block;
                        width: 10px;
                        height: 10px;
                        border-radius: 2px;
                        background-color: ${colorByLanguage.get(language) ??
                        euiTheme.colors.lightShade};
                      `}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      <strong>{count}</strong> {language}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      ) : (
        <EuiText size="xs" color="subdued" css={{ marginTop: euiTheme.size.s }}>
          {EMPTY_LABEL}
        </EuiText>
      )}
    </EuiPanel>
  );
}

const TITLE = i18n.translate('xpack.streams.codeIntelligenceTab.languages.title', {
  defaultMessage: 'Languages',
});
const SUBTITLE = i18n.translate('xpack.streams.codeIntelligenceTab.languages.subtitle', {
  defaultMessage: 'Languages identified across ingested code',
});
const EMPTY_LABEL = i18n.translate('xpack.streams.codeIntelligenceTab.languages.empty', {
  defaultMessage: 'No languages identified yet.',
});
