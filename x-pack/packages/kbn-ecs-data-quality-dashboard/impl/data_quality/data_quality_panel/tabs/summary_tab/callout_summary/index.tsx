/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard, EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useCallback, useMemo } from 'react';

import { MissingTimestampCallout } from '../../callouts/missing_timestamp_callout';
import { IncompatibleCallout } from '../../callouts/incompatible_callout';
import { showMissingTimestampCallout } from '../../helpers';
import { getMarkdownComments } from '../helpers';
import { EMPTY_STAT } from '../../../../helpers';
import { showInvalidCallout } from '../../incompatible_tab/helpers';
import { CopyToClipboardButton } from '../../styles';
import * as i18n from '../../../index_properties/translations';
import { COPIED_RESULTS_TOAST_TITLE } from '../../../../translations';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../../types';

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  addToNewCaseDisabled: boolean;
  defaultNumberFormat: string;
  docsCount: number;
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  onAddToNewCase: (markdownComment: string[]) => void;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  pattern: string;
  patternDocsCount: number;
}

const CalloutSummaryComponent: React.FC<Props> = ({
  addSuccessToast,
  addToNewCaseDisabled,
  defaultNumberFormat,
  docsCount,
  ilmPhase,
  indexName,
  onAddToNewCase,
  partitionedFieldMetadata,
  pattern,
  patternDocsCount,
}) => {
  const formatNumber = useCallback(
    (value: number | undefined): string =>
      value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT,
    [defaultNumberFormat]
  );
  const markdownComments: string[] = useMemo(
    () =>
      getMarkdownComments({
        docsCount,
        formatNumber,
        ilmPhase,
        indexName,
        partitionedFieldMetadata,
        pattern,
        patternDocsCount,
      }),
    [
      docsCount,
      formatNumber,
      ilmPhase,
      indexName,
      partitionedFieldMetadata,
      pattern,
      patternDocsCount,
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
          </EuiFlexGroup>

          <EuiSpacer size="s" />
        </>
      )}
    </>
  );
};

CalloutSummaryComponent.displayName = 'CalloutSummaryComponent';

export const CalloutSummary = React.memo(CalloutSummaryComponent);
