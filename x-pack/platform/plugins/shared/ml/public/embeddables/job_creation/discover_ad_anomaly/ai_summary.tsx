/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiIcon, EuiSkeletonText, EuiSpacer, EuiText } from '@elastic/eui';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useMlApi } from '../../../application/contexts/kibana';

const ACCORDION_ID = 'mlDiscoverADAnomalyAiSummary';

interface Props {
  jobId: string;
  /** The start of the time range of the anomaly, in epoch ms */
  timestamp: number;
  /** The end of the time range of the anomaly, in epoch ms */
  endTimestamp: number;
}

interface Summary {
  isLoading: boolean;
  text?: string;
  error?: string;
}

/** A section which asks AI for a very brief description of the anomaly when it is first expanded. */
export const AiSummary: FC<Props> = ({ jobId, timestamp, endTimestamp }) => {
  const mlApi = useMlApi();
  const [summary, setSummary] = useState<Summary>();
  const abortController = useRef<AbortController>();

  useEffect(() => () => abortController.current?.abort(), []);

  // The summary is for the anomaly the section was first expanded for
  const onToggle = useCallback(
    (isOpen: boolean) => {
      if (!isOpen || summary !== undefined) {
        return;
      }

      const controller = (abortController.current = new AbortController());
      setSummary({ isLoading: true });
      mlApi.jobs
        .summarizeAnomaly({ jobId, start: timestamp, end: endTimestamp }, controller.signal)
        .then(({ summary: text }) => setSummary({ isLoading: false, text }))
        .catch((error) => {
          if (!controller.signal.aborted) {
            setSummary({ isLoading: false, error: extractErrorMessage(error) });
          }
        });
    },
    [mlApi, summary, jobId, timestamp, endTimestamp]
  );

  return (
    <EuiAccordion
      id={ACCORDION_ID}
      data-test-subj={ACCORDION_ID}
      buttonContent={
        <>
          <EuiIcon type="sparkles" aria-hidden={true} />{' '}
          {i18n.translate('xpack.ml.discoverADAnomalyFlyout.aiSummaryTitle', {
            defaultMessage: 'AI summary',
          })}
        </>
      }
      onToggle={onToggle}
      paddingSize="m"
    >
      {summary?.isLoading ? (
        <EuiSkeletonText lines={3} data-test-subj="mlDiscoverADAnomalyAiSummaryLoading" />
      ) : null}
      {summary?.text ? (
        <EuiText size="s" data-test-subj="mlDiscoverADAnomalyAiSummaryText">
          <p>{summary.text}</p>
        </EuiText>
      ) : null}
      {summary?.error ? (
        <KbnDangerCallout
          announceOnMount
          title={i18n.translate('xpack.ml.discoverADAnomalyFlyout.aiSummaryError', {
            defaultMessage: 'The summary could not be generated',
          })}
          text={summary.error}
          data-test-subj="mlDiscoverADAnomalyAiSummaryError"
        />
      ) : null}
      <EuiSpacer size="xs" />
    </EuiAccordion>
  );
};
