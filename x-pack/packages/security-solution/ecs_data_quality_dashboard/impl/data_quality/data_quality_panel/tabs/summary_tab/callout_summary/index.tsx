/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewChat } from '@kbn/elastic-assistant';
import { copyToClipboard, EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { MissingTimestampCallout } from '../../callouts/missing_timestamp_callout';
import { IncompatibleCallout } from '../../callouts/incompatible_callout';
import { showMissingTimestampCallout } from '../../helpers';
import { getMarkdownComments } from '../helpers';
import { showInvalidCallout } from '../../incompatible_tab/helpers';
import { CopyToClipboardButton } from '../../styles';
import * as i18n from '../../../index_properties/translations';
import {
  COPIED_RESULTS_TOAST_TITLE,
  DATA_QUALITY_PROMPT_CONTEXT_PILL,
  DATA_QUALITY_PROMPT_CONTEXT_PILL_TOOLTIP,
  DATA_QUALITY_SUGGESTED_USER_PROMPT,
} from '../../../../translations';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../../types';
import { DATA_QUALITY_DASHBOARD_CONVERSATION_ID } from './translations';
import { useDataQualityContext } from '../../../data_quality_context';

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  addToNewCaseDisabled: boolean;
  docsCount: number;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  isAssistantEnabled: boolean;
  onAddToNewCase: (markdownComment: string[]) => void;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  pattern: string;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
}

const CalloutSummaryComponent: React.FC<Props> = ({
  addSuccessToast,
  addToNewCaseDisabled,
  docsCount,
  formatBytes,
  formatNumber,
  ilmPhase,
  indexName,
  isAssistantEnabled,
  onAddToNewCase,
  partitionedFieldMetadata,
  pattern,
  patternDocsCount,
  sizeInBytes,
}) => {
  const { isILMAvailable } = useDataQualityContext();
  const markdownComments: string[] = useMemo(
    () =>
      getMarkdownComments({
        docsCount,
        formatBytes,
        formatNumber,
        ilmPhase,
        indexName,
        isILMAvailable,
        partitionedFieldMetadata,
        pattern,
        patternDocsCount,
        sizeInBytes,
      }),
    [
      docsCount,
      formatBytes,
      formatNumber,
      ilmPhase,
      indexName,
      isILMAvailable,
      partitionedFieldMetadata,
      pattern,
      patternDocsCount,
      sizeInBytes,
    ]
  );

  const onClickAddToCase = useCallback(
    () => onAddToNewCase([markdownComments.join('\n')]),
    [markdownComments, onAddToNewCase]
  );

  const onCopy = useCallback(() => {
    copyToClipboard(markdownComments.join('\n'));

    addSuccessToast({
      title: COPIED_RESULTS_TOAST_TITLE,
    });
  }, [addSuccessToast, markdownComments]);

  const getPromptContext = useCallback(async () => markdownComments.join('\n'), [markdownComments]);

  const showActions =
    showInvalidCallout(partitionedFieldMetadata.incompatible) ||
    showMissingTimestampCallout(partitionedFieldMetadata.ecsCompliant);

  return (
    <>
      {showInvalidCallout(partitionedFieldMetadata.incompatible) && (
        <>
          <IncompatibleCallout enrichedFieldMetadata={partitionedFieldMetadata.incompatible} />
          <EuiSpacer size="s" />
        </>
      )}
      {showMissingTimestampCallout(partitionedFieldMetadata.ecsCompliant) && (
        <>
          <MissingTimestampCallout />
          <EuiSpacer size="s" />
        </>
      )}
      {showActions && (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiButton
                aria-label={i18n.ADD_TO_NEW_CASE}
                disabled={addToNewCaseDisabled}
                onClick={onClickAddToCase}
              >
                {i18n.ADD_TO_NEW_CASE}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <CopyToClipboardButton aria-label={i18n.COPY_TO_CLIPBOARD} onClick={onCopy}>
                {i18n.COPY_TO_CLIPBOARD}
              </CopyToClipboardButton>
            </EuiFlexItem>

            {isAssistantEnabled && (
              <EuiFlexItem grow={false}>
                <NewChat
                  conversationId={DATA_QUALITY_DASHBOARD_CONVERSATION_ID}
                  category="data-quality-dashboard"
                  description={DATA_QUALITY_PROMPT_CONTEXT_PILL(indexName)}
                  getPromptContext={getPromptContext}
                  suggestedUserPrompt={DATA_QUALITY_SUGGESTED_USER_PROMPT}
                  tooltip={DATA_QUALITY_PROMPT_CONTEXT_PILL_TOOLTIP}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiSpacer size="s" />
        </>
      )}
    </>
  );
};

CalloutSummaryComponent.displayName = 'CalloutSummaryComponent';

export const CalloutSummary = React.memo(CalloutSummaryComponent);
