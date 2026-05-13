/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

/**
 * Shared stat display for the stream Overview page panels.
 * Renders a value + a subdued description label, with consistent formatting.
 */
export function OverviewStat({
  title,
  description,
  isLoading,
  titleSize = 's',
  titleColor,
  dataTestSubj,
}: {
  title: React.ReactNode;
  description: string;
  isLoading: boolean;
  titleSize?: 's' | 'm';
  titleColor?: 'primary' | 'success' | 'danger' | 'warning' | 'accent' | 'text';
  dataTestSubj?: string;
}) {
  return (
    <EuiStat
      title={title}
      description={
        <EuiText size="s" color="subdued">
          {description}
        </EuiText>
      }
      isLoading={isLoading}
      titleSize={titleSize}
      titleColor={titleColor}
      data-test-subj={dataTestSubj}
    />
  );
}

/**
 * Stat used next to the ingest chart: primary value reflects the selected time range;
 * subdued line below shows all-time totals (not time-filtered).
 */
export function OverviewStatWithTotal({
  description,
  rangeTitle,
  totalLine,
  isLoading,
  descriptionInfoTooltip,
  dataTestSubj,
}: {
  description: string;
  rangeTitle: React.ReactNode;
  /** When omitted, the subdued total line is not rendered (e.g. query streams with no all-time total). */
  totalLine?: string;
  isLoading: boolean;
  descriptionInfoTooltip?: string;
  dataTestSubj?: string;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
        {descriptionInfoTooltip ? (
          <EuiFlexItem grow={false}>
            <EuiIconTip
              type="question"
              color="subdued"
              size="s"
              content={descriptionInfoTooltip}
              aria-label={i18n.translate(
                'xpack.streams.streamOverview.overviewStat.moreInfoAriaLabel',
                {
                  defaultMessage: 'More information',
                }
              )}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiTitle
        size="xs"
        css={{
          color: euiTheme.colors.text,
          lineHeight: 1.2,
        }}
      >
        <span>{isLoading ? '—' : rangeTitle}</span>
      </EuiTitle>
      {totalLine !== undefined ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {totalLine}
          </EuiText>
        </>
      ) : null}
    </div>
  );
}
