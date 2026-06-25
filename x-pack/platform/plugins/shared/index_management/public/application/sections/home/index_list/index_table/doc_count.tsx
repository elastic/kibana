/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiLoadingSpinner, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { INDEX_CLOSED, INDEX_CLOSED_LABEL } from '../../../../../../common/constants';
import { type DocCountResult, type docCountApi, RequestResultType } from './get_doc_count';
interface DocCountCellProps {
  indexName: string;
  indexStatus?: string;
  docCountApi: ReturnType<typeof docCountApi>;
}

const REOPEN_DOC_COUNT_FETCH_DELAY_MS = 1000;

const isClosedIndexStatus = (indexStatus?: string) =>
  indexStatus === INDEX_CLOSED || indexStatus === INDEX_CLOSED_LABEL;

interface ReopenFetchState {
  responseAtRequestStart?: Record<string, DocCountResult>;
  hasRequestStarted: boolean;
}

export const DocCountCell = ({ indexName, indexStatus, docCountApi }: DocCountCellProps) => {
  const isClosedIndex = isClosedIndexStatus(indexStatus);
  const docCountResponse = useObservable<Record<string, DocCountResult>>(
    docCountApi.getObservable()
  );
  const result = docCountResponse ? docCountResponse[indexName] : undefined;
  const wasClosedIndexRef = useRef(isClosedIndex);
  const latestDocCountResponseRef = useRef(docCountResponse);
  const [reopenFetchState, setReopenFetchState] = useState<ReopenFetchState | null>(null);

  useEffect(() => {
    latestDocCountResponseRef.current = docCountResponse;
  }, [docCountResponse]);

  useEffect(() => {
    const wasClosedIndex = wasClosedIndexRef.current;
    wasClosedIndexRef.current = isClosedIndex;

    if (isClosedIndex) {
      setReopenFetchState(null);
      return;
    }

    if (!wasClosedIndex) {
      docCountApi.getByName(indexName);
      return;
    }

    setReopenFetchState({ hasRequestStarted: false });

    const timeoutId = window.setTimeout(() => {
      setReopenFetchState({
        hasRequestStarted: true,
        responseAtRequestStart: latestDocCountResponseRef.current,
      });
      docCountApi.getByName(indexName);
    }, REOPEN_DOC_COUNT_FETCH_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
      setReopenFetchState(null);
    };
  }, [docCountApi, indexName, isClosedIndex]);

  // Compare per-index rather than the whole response object — scan() always emits a new
  // object, so object identity would fire whenever ANY index's count updates, not just ours.
  useEffect(() => {
    if (
      reopenFetchState?.hasRequestStarted &&
      docCountResponse?.[indexName] !== reopenFetchState.responseAtRequestStart?.[indexName]
    ) {
      setReopenFetchState(null);
    }
  }, [docCountResponse, indexName, reopenFetchState]);

  if (isClosedIndex) {
    const tooltipContent = i18n.translate('xpack.idxMgmt.indexTable.docCountClosedIndexTooltip', {
      defaultMessage: 'Document count is unavailable for closed indices.',
    });

    return (
      <EuiToolTip content={tooltipContent}>
        <EuiText
          size="s"
          color="subdued"
          tabIndex={0}
          aria-label={tooltipContent}
          data-test-subj="docCountClosedIndex"
        >
          -
        </EuiText>
      </EuiToolTip>
    );
  }

  if (reopenFetchState || result === undefined) {
    return <EuiLoadingSpinner size="m" data-test-subj="docCountLoadingSpinner" />;
  }

  if (result.status === RequestResultType.Error) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.idxMgmt.indexTable.docCountErrorTooltip', {
          defaultMessage: 'Error loading document count',
        })}
      >
        <EuiText size="s" color="danger" tabIndex={0}>
          {i18n.translate('xpack.idxMgmt.indexTable.docCountErrorLabel', {
            defaultMessage: 'Error',
          })}
        </EuiText>
      </EuiToolTip>
    );
  }

  return Number(result.count).toLocaleString();
};
