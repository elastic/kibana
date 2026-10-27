/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { changeHistoryPreviewTypography } from './change_history_preview_typography';

export type ChangeHistoryCompareBadgeColor = 'hollow' | 'warning';

/** Version labels for the compare headers. Baseline = older side; current = newer / selected side. */
export interface ChangeHistoryCompareIndicator {
  baselineVersion?: number;
  currentVersion?: number;
  currentBadgeLabel?: string;
  currentBadgeColor?: ChangeHistoryCompareBadgeColor;
}

export interface ChangeHistoryCompareIndicatorProps {
  indicator: ChangeHistoryCompareIndicator;
}

const versionBadgeStyle = css({
  fontWeight: 500,
});

const compareHeaderBaseStyle = ({ euiTheme }: UseEuiTheme) =>
  css(changeHistoryPreviewTypography, {
    flex: '0 0 auto',
    borderBottom: euiTheme.border.thin,
  });

const compareIndicatorStyles = {
  unifiedContainer: (themeContext: UseEuiTheme) =>
    css(compareHeaderBaseStyle(themeContext), {
      padding: `${themeContext.euiTheme.size.s} ${themeContext.euiTheme.size.m}`,
    }),
  splitContainer: compareHeaderBaseStyle,
  splitPaneLeft: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '1 1 50%',
      padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
      borderRight: euiTheme.border.thin,
    }),
  splitPaneRight: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: '1 1 50%',
      padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
    }),
  label: ({ euiTheme }: UseEuiTheme) =>
    css(changeHistoryPreviewTypography, {
      color: euiTheme.colors.textParagraph,
      fontWeight: euiTheme.font.weight.regular,
    }),
};

const VersionBadge = ({
  version,
  badgeLabel,
  badgeColor = 'hollow',
  testSubj,
}: {
  version?: number;
  badgeLabel?: string;
  badgeColor?: ChangeHistoryCompareBadgeColor;
  testSubj: string;
}): JSX.Element | null => {
  const { euiTheme } = useEuiTheme();

  if (version != null) {
    return (
      <EuiBadge color="hollow" css={versionBadgeStyle} data-test-subj={testSubj}>
        {i18n.translate('xpack.changeHistoryUi.preview.versionBadge', {
          defaultMessage: 'v{version}',
          values: { version },
        })}
      </EuiBadge>
    );
  }

  if (badgeLabel) {
    return (
      <EuiBadge
        color={badgeColor === 'warning' ? euiTheme.colors.backgroundLightWarning : 'hollow'}
        css={versionBadgeStyle}
        data-test-subj={testSubj}
      >
        {badgeLabel}
      </EuiBadge>
    );
  }

  return (
    <EuiText size="s" color="subdued" data-test-subj={testSubj}>
      {i18n.translate('xpack.changeHistoryUi.preview.versionBadgeFallback', {
        defaultMessage: 'Selected version',
      })}
    </EuiText>
  );
};

export const ChangeHistoryCompareIndicatorBar = ({
  indicator,
}: ChangeHistoryCompareIndicatorProps): JSX.Element => {
  const styles = useMemoCss(compareIndicatorStyles);

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={styles.unifiedContainer}
      data-test-subj="changeHistoryCompareIndicator"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s" css={styles.label}>
          {i18n.translate('xpack.changeHistoryUi.preview.comparingWithLabel', {
            defaultMessage: 'Comparing with:',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <VersionBadge
          version={indicator.baselineVersion}
          testSubj="changeHistoryCompareIndicatorBadge"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ChangeHistoryCompareSplitPaneLabels = ({
  indicator,
}: ChangeHistoryCompareIndicatorProps): JSX.Element => {
  const styles = useMemoCss(compareIndicatorStyles);

  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      css={styles.splitContainer}
      data-test-subj="changeHistoryCompareSplitPaneLabels"
    >
      <EuiFlexItem css={styles.splitPaneLeft}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" css={styles.label}>
              {i18n.translate('xpack.changeHistoryUi.preview.previousVersionLabel', {
                defaultMessage: 'Previous version:',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <VersionBadge
              version={indicator.baselineVersion}
              testSubj="changeHistoryCompareSplitBaselineBadge"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem css={styles.splitPaneRight}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" css={styles.label}>
              {i18n.translate('xpack.changeHistoryUi.preview.selectedVersionLabel', {
                defaultMessage: 'Selected version:',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <VersionBadge
              version={indicator.currentVersion}
              badgeLabel={indicator.currentBadgeLabel}
              badgeColor={indicator.currentBadgeColor}
              testSubj="changeHistoryCompareSplitCurrentBadge"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
