/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { JobSuggestion } from '../../../../../common/types/job_suggestions';
import { describeTimeRange } from '../describe_time_range';
import type { SuggestionRun } from '../previous_runs';
import { SuggestionCards } from './suggestion_cards';

interface Props {
  run: SuggestionRun;
  onSelect: (suggestion: JobSuggestion) => void;
}

export const PreviousRun: FC<Props> = ({ run, onSelect }) => (
  <div data-test-subj="mlSuggestADJobsPrevious">
    <EuiHorizontalRule />
    <EuiTitle size="xs">
      <h3>
        <FormattedMessage
          id="xpack.ml.suggestADJobsFlyout.previousResultsTitle"
          defaultMessage="Previous results"
        />
      </h3>
    </EuiTitle>
    <EuiText size="s" color="subdued" data-test-subj="mlSuggestADJobsPreviousRun">
      <FormattedMessage
        id="xpack.ml.suggestADJobsFlyout.previousResultsDescription"
        defaultMessage="{timeRange}, run {ranAt}"
        values={{
          timeRange: describeTimeRange(run.timeRange),
          ranAt: moment(run.ranAt).fromNow(),
        }}
      />
    </EuiText>
    <EuiSpacer size="m" />
    <SuggestionCards
      suggestions={run.suggestions}
      onSelect={onSelect}
      testSubjPrefix="mlSuggestADJobsPrevious"
    />
  </div>
);
