/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useContext } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { ChangeHistoryConfigContext } from '../../provider/change_history_config_context';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import { ChangeHistoryActionBadge } from '../timeline/change_history_action_badge';
import { changeHistoryPreviewTypography } from './change_history_preview_typography';

/** The compared rows. Baseline = older side; target = newer / selected side. */
export interface ChangeHistoryCompareIndicatorProps {
  baseline: ChangeHistoryListItem;
  target: ChangeHistoryListItem;
}

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

/** Renders the host's `renderBadge` for the row, falling back to the default action badge. */
const CompareRowBadge = ({ item }: { item: ChangeHistoryListItem }): JSX.Element => {
  const renderBadge = useContext(ChangeHistoryConfigContext)?.renderBadge;

  return <>{renderBadge ? renderBadge({ item }) : <ChangeHistoryActionBadge item={item} />}</>;
};

export const ChangeHistoryCompareIndicatorBar = ({
  baseline,
  target,
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
        <CompareRowBadge item={baseline} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ChangeHistoryCompareSplitPaneLabels = ({
  baseline,
  target,
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
            <CompareRowBadge item={baseline} />
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
            <CompareRowBadge item={target} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
