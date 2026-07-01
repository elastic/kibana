/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import { useChangeHistoryDetail } from '../../hooks/use_change_history_detail';
import { useChangeHistoryCompare } from '../../hooks/use_change_history_compare';
import { useChangeHistoryDiffTelemetry } from '../../hooks/use_change_history_diff_telemetry';
import type { ChangeHistoryCompareRowOverride } from '../../types/change_history_compare_override';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import { getChangeHistoryErrorMessage } from '../../utils/get_change_history_error_message';
import * as i18n from '../timeline/translations';

const previewPanelStateCss = css`
  height: 100%;
  width: 100%;
`;

const previewContainerCss = css`
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const usePreviewFrameStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () =>
      css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        margin: ${euiTheme.size.s};
        border-radius: ${euiTheme.border.radius.small};
        border: ${euiTheme.border.thin};
        background: ${euiTheme.colors.backgroundBaseSubdued};
      `,
    [euiTheme]
  );
};

const previewContentCss = css`
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const PreviewPanelState = ({
  children,
  testSubj,
}: {
  children: React.ReactNode;
  testSubj: string;
}): JSX.Element => (
  <EuiFlexGroup
    direction="column"
    alignItems="center"
    justifyContent="center"
    responsive={false}
    css={previewPanelStateCss}
    data-test-subj={testSubj}
  >
    {children}
  </EuiFlexGroup>
);

export interface ChangeHistoryPreviewPanelProps {
  selectedChangeId?: string;
  listItems?: ChangeHistoryListItem[];
  compareOverride?: ChangeHistoryCompareRowOverride;
}

export const ChangeHistoryPreviewPanel: FC<ChangeHistoryPreviewPanelProps> = ({
  selectedChangeId,
  listItems = [],
  compareOverride,
}) => {
  const previewFrameCss = usePreviewFrameStyles();
  const { adapter, objectId, renderPreview, supports } = useChangeHistoryConfig();
  const { change, isLoading, error } = useChangeHistoryDetail({
    adapter,
    objectId,
    changeId: selectedChangeId,
    enabled: Boolean(selectedChangeId),
  });

  const { compareSpec, isLoadingCompareContext } = useChangeHistoryCompare({
    adapter,
    objectId,
    listItems,
    selectedChange: change,
    selectedChangeId,
    compareOverride: supports.compare ? compareOverride : undefined,
    enabled: supports.compare,
  });

  const diffTelemetry = useChangeHistoryDiffTelemetry({
    compareSpec,
    isLoadingCompareContext,
  });

  if (!selectedChangeId) {
    return (
      <PreviewPanelState testSubj="changeHistoryPreviewEmpty">
        <EuiFlexItem grow={false}>
          <EuiEmptyPrompt
            iconType="inspect"
            title={<h3>{i18n.SELECT_CHANGE_PROMPT}</h3>}
            titleSize="xs"
          />
        </EuiFlexItem>
      </PreviewPanelState>
    );
  }

  if (isLoading) {
    return (
      <PreviewPanelState testSubj="changeHistoryPreviewLoading">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" textAlign="center">
            {i18n.PREVIEW_LOADING}
          </EuiText>
        </EuiFlexItem>
      </PreviewPanelState>
    );
  }

  if (error || !change) {
    const errorMessage = error ? getChangeHistoryErrorMessage(error) : undefined;

    return (
      <PreviewPanelState testSubj="changeHistoryPreviewError">
        <EuiFlexItem grow={false}>
          <EuiEmptyPrompt
            iconType="alert"
            title={<h3>{i18n.PREVIEW_ERROR}</h3>}
            body={
              errorMessage ? (
                <EuiText size="s" color="subdued">
                  <p>{errorMessage}</p>
                </EuiText>
              ) : undefined
            }
            titleSize="xs"
          />
        </EuiFlexItem>
      </PreviewPanelState>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={previewContainerCss}
      data-test-subj="changeHistoryPreview"
    >
      <EuiFlexItem grow={true} css={previewFrameCss} data-test-subj="changeHistoryPreviewFrame">
        <div css={previewContentCss}>
          {renderPreview({
            change,
            objectId,
            compareSpec,
            isLoadingCompareContext,
            diffTelemetry,
          })}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
