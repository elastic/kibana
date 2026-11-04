/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { SuggestionsState } from './job_suggestion_service';

interface Props {
  state: SuggestionsState;
  onStop: () => void;
  onRunAgain: () => void;
  testSubjPrefix: string;
}

/**
 * What to show instead of suggestions while they are loading, or when there are none to show.
 * Renders nothing when the state has suggestions.
 */
export const SuggestionStatus: FC<Props> = ({ state, onStop, onRunAgain, testSubjPrefix }) => {
  if (state.status === 'loading') {
    return (
      <EuiEmptyPrompt
        data-test-subj={`${testSubjPrefix}Loading`}
        icon={<EuiLoadingSpinner size="xl" />}
        title={
          <h3>
            <FormattedMessage
              id="xpack.ml.suggestADJobsFlyout.loadingTitle"
              defaultMessage="Analyzing your data"
            />
          </h3>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.ml.suggestADJobsFlyout.loadingDescription"
              defaultMessage="This can take up to a minute."
            />
          </p>
        }
        actions={
          <EuiButton
            size="s"
            iconType="stop"
            onClick={onStop}
            data-test-subj={`${testSubjPrefix}Stop`}
          >
            <FormattedMessage id="xpack.ml.suggestADJobsFlyout.stopButton" defaultMessage="Stop" />
          </EuiButton>
        }
      />
    );
  }
  if (state.status === 'cancelled') {
    return (
      <EuiEmptyPrompt
        data-test-subj={`${testSubjPrefix}Cancelled`}
        title={
          <h3>
            <FormattedMessage
              id="xpack.ml.suggestADJobsFlyout.cancelledTitle"
              defaultMessage="Analysis stopped"
            />
          </h3>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.ml.suggestADJobsFlyout.cancelledDescription"
              defaultMessage="No jobs were suggested from this run."
            />
          </p>
        }
        actions={
          <EuiButton size="s" onClick={onRunAgain} data-test-subj={`${testSubjPrefix}RunAgain`}>
            <FormattedMessage
              id="xpack.ml.suggestADJobsFlyout.runAgainButton"
              defaultMessage="Run again"
            />
          </EuiButton>
        }
      />
    );
  }
  if (state.status === 'error') {
    return (
      <KbnDangerCallout
        announceOnMount
        data-test-subj={`${testSubjPrefix}Error`}
        title={i18n.translate('xpack.ml.suggestADJobsFlyout.errorTitle', {
          defaultMessage: 'Could not suggest jobs',
        })}
      >
        {extractErrorMessage(state.error)}
      </KbnDangerCallout>
    );
  }
  if (state.suggestions.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj={`${testSubjPrefix}Empty`}
        body={
          <p>
            <FormattedMessage
              id="xpack.ml.suggestADJobsFlyout.emptyDescription"
              defaultMessage="No suitable jobs were found for this data. Try a different time range."
            />
          </p>
        }
      />
    );
  }
  return null;
};
