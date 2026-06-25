/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, useMemo } from 'react';
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
import { useChangeHistoryListItems } from '../../provider/change_history_list_items_context';
import { useChangeHistoryDetail } from '../../hooks/use_change_history_detail';
import { getPreviousChangeId } from '../../utils/get_previous_change_id';
import { getChangeHistoryErrorMessage } from '../../utils/get_change_history_error_message';
import * as i18n from '../timeline/translations';

const fullHeightCenterCss = css`
  height: 100%;
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
  testSubj,
  children,
}: {
  testSubj: string;
  children: ReactNode;
}): JSX.Element => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent="center"
    css={fullHeightCenterCss}
    data-test-subj={testSubj}
  >
    <EuiFlexItem grow={false}>{children}</EuiFlexItem>
  </EuiFlexGroup>
);

export function ChangeHistoryPreviewPanel(): JSX.Element {
  const previewFrameCss = usePreviewFrameStyles();
  const { adapter, objectId, renderPreview, selectedChangeId } = useChangeHistoryConfig();
  const listItems = useChangeHistoryListItems();
  const compareChangeId = getPreviousChangeId(listItems, selectedChangeId);
  const isCompareChangeLoaded = compareChangeId
    ? listItems.some((item) => item.id === compareChangeId)
    : false;

  const { change, isLoading, error } = useChangeHistoryDetail({
    adapter,
    objectId,
    changeId: selectedChangeId,
    enabled: Boolean(selectedChangeId),
  });
  const { change: compareChange } = useChangeHistoryDetail({
    adapter,
    objectId,
    changeId: compareChangeId,
    enabled: Boolean(compareChangeId && isCompareChangeLoaded),
  });

  if (!selectedChangeId) {
    return (
      <PreviewPanelState testSubj="changeHistoryPreviewEmpty">
        <EuiEmptyPrompt
          iconType="inspect"
          title={<h3>{i18n.SELECT_CHANGE_PROMPT}</h3>}
          titleSize="xs"
        />
      </PreviewPanelState>
    );
  }

  if (isLoading) {
    return (
      <PreviewPanelState testSubj="changeHistoryPreviewLoading">
        <EuiLoadingSpinner size="l" />
        <EuiText size="s" color="subdued">
          {i18n.PREVIEW_LOADING}
        </EuiText>
      </PreviewPanelState>
    );
  }

  if (error || !change) {
    const errorMessage = error ? getChangeHistoryErrorMessage(error) : undefined;

    return (
      <PreviewPanelState testSubj="changeHistoryPreviewError">
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
        <div css={previewContentCss}>{renderPreview({ change, objectId, compareChange })}</div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
