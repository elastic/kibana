/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEsqlWizardContext } from './esql_wizard_context';
import { getQueryTimeRangeBlockedReason } from './esql_step_gating';

/**
 * Inline explanation, rendered just above the wizard nav, of why `Next` is
 * disabled on step 1 when the row-count histogram is the blocker (loading,
 * failed, or empty). Display only: which conditions block `Next` is decided by
 * `isQueryTimeRangeStepValid`.
 */
export const EsqlNextBlockedExplanation = () => {
  const { state } = useEsqlWizardContext();
  const reason = getQueryTimeRangeBlockedReason(state);

  if (reason === undefined) return null;

  if (reason.type === 'histogramLoading') {
    return (
      <EuiText
        size="s"
        color="subdued"
        data-test-subj="mlEsqlNextBlockedReason"
        data-reason="histogramLoading"
      >
        <p>
          {i18n.translate('xpack.ml.esqlJob.nextBlocked.histogramLoading', {
            defaultMessage: 'Next is unavailable until the row-count histogram finishes loading.',
          })}
        </p>
      </EuiText>
    );
  }

  if (reason.type === 'histogramError') {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="warning"
        iconType="warning"
        title={i18n.translate('xpack.ml.esqlJob.nextBlocked.histogramErrorTitle', {
          defaultMessage:
            'Next is unavailable because the row-count histogram failed: {errorMessage}',
          values: {
            errorMessage:
              reason.errorMessage ??
              i18n.translate('xpack.ml.esqlJob.nextBlocked.histogramErrorUnknownReason', {
                defaultMessage: 'unknown error',
              }),
          },
        })}
        data-test-subj="mlEsqlNextBlockedReason"
        data-reason="histogramError"
      />
    );
  }

  if (reason.previewHasRows) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="warning"
        iconType="warning"
        title={i18n.translate('xpack.ml.esqlJob.nextBlocked.histogramEmptyPreviewHasRowsTitle', {
          defaultMessage:
            'Next is unavailable: the output preview has rows, but the histogram, which buckets on the emitted time field, found none.',
        })}
        data-test-subj="mlEsqlNextBlockedReason"
        data-reason="histogramEmptyPreviewHasRows"
      >
        <p>
          {i18n.translate('xpack.ml.esqlJob.nextBlocked.histogramEmptyPreviewHasRowsDescription', {
            defaultMessage:
              'Check the emitted time field and the source time field choices: the emitted time field must hold valid timestamps for the rows the query returns.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      size="s"
      color="warning"
      iconType="warning"
      title={i18n.translate('xpack.ml.esqlJob.nextBlocked.histogramEmptyTitle', {
        defaultMessage:
          'Next is unavailable: the row-count histogram returned no rows for the selected time range.',
      })}
      data-test-subj="mlEsqlNextBlockedReason"
      data-reason="histogramEmpty"
    >
      <p>
        {i18n.translate('xpack.ml.esqlJob.nextBlocked.histogramEmptyDescription', {
          defaultMessage: 'Widen the time range or adjust the query so it produces output.',
        })}
      </p>
    </EuiCallOut>
  );
};
