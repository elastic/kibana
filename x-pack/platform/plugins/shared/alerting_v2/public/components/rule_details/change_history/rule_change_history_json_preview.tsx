/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import { diffJson } from 'diff';

const formatSnapshot = (snapshot: unknown): string => JSON.stringify(snapshot, null, 2);

const RuleChangeHistoryJsonPreview = ({
  change,
  compareSpec,
  diffTelemetry,
  isLoadingCompareContext,
}: Parameters<ChangeHistoryPreviewRenderFn>[0]): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const targetSnapshot = compareSpec?.target.snapshot ?? change.snapshot;
  const baselineSnapshot = compareSpec?.baseline.snapshot;
  const hasCompare = Boolean(compareSpec && baselineSnapshot !== undefined);

  const diffParts = useMemo(() => {
    if (!hasCompare || baselineSnapshot === undefined) {
      return undefined;
    }

    return diffJson(baselineSnapshot, targetSnapshot);
  }, [baselineSnapshot, hasCompare, targetSnapshot]);

  const hasChanges = useMemo(
    () => Boolean(diffParts?.some((part) => part.added || part.removed)),
    [diffParts]
  );

  useEffect(() => {
    if (!hasCompare || isLoadingCompareContext || !hasChanges) {
      return;
    }

    diffTelemetry?.reportDiffViewed();
  }, [diffTelemetry, hasChanges, hasCompare, isLoadingCompareContext]);

  if (!diffParts) {
    return (
      <EuiCodeBlock
        language="json"
        isCopyable
        paddingSize="m"
        fontSize="s"
        overflowHeight={640}
        data-test-subj="ruleChangeHistoryJsonPreview"
        css={css`
          height: 100%;
          margin: 0;
        `}
      >
        {formatSnapshot(targetSnapshot)}
      </EuiCodeBlock>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      responsive={false}
      css={css`
        height: 100%;
        min-height: 0;
        padding: ${euiTheme.size.s};
      `}
      data-test-subj="ruleChangeHistoryJsonDiffPreview"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.alertingV2.ruleChangeHistory.jsonDiffHint', {
            defaultMessage:
              'JSON diff vs {comparisonType, select, vs_previous {previous version} other {selected version}}',
            values: { comparisonType: compareSpec?.comparisonType ?? 'vs_previous' },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem
        grow
        css={css`
          min-height: 0;
          overflow: auto;
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.small};
          background: ${euiTheme.colors.backgroundBasePlain};
          font-family: ${euiTheme.font.familyCode};
          font-size: ${euiTheme.size.m};
          line-height: 1.5;
          white-space: pre;
        `}
      >
        <div
          css={css`
            padding: ${euiTheme.size.m};
          `}
        >
          {diffParts.map((part, index) => {
            let background = 'transparent';
            let color = euiTheme.colors.textParagraph;

            if (part.added) {
              background = euiTheme.colors.backgroundBaseSuccess;
              color = euiTheme.colors.textSuccess;
            } else if (part.removed) {
              background = euiTheme.colors.backgroundBaseDanger;
              color = euiTheme.colors.textDanger;
            }

            return (
              <span
                // Diff parts are stable for a given baseline/target pair.
                key={`${index}-${part.added ? 'a' : ''}${part.removed ? 'r' : ''}-${
                  part.value.length
                }`}
                css={css`
                  background: ${background};
                  color: ${color};
                `}
              >
                {part.value}
              </span>
            );
          })}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const renderRuleChangeHistoryJsonPreview: ChangeHistoryPreviewRenderFn = (props) => (
  <RuleChangeHistoryJsonPreview {...props} />
);
