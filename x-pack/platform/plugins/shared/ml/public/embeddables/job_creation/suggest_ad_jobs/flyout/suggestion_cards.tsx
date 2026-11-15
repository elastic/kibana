/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { JobSuggestion } from '../../../../../common/types/job_suggestions';
import { SuggestionBadges } from '../../../../application/components/job_suggestion/suggestion_badges';

interface Props {
  suggestions: JobSuggestion[];
  onSelect: (suggestion: JobSuggestion) => void;
  /** Tells the cards of different lists apart, in tests. */
  testSubjPrefix: string;
}

export const SuggestionCards: FC<Props> = ({ suggestions, onSelect, testSubjPrefix }) => (
  <EuiFlexGroup direction="column" gutterSize="m" data-test-subj={`${testSubjPrefix}List`}>
    {suggestions.map((suggestion) => (
      <EuiFlexItem key={suggestion.id}>
        <EuiCard
          hasBorder
          textAlign="left"
          titleSize="xs"
          title={suggestion.title}
          description={suggestion.description}
          onClick={() => onSelect(suggestion)}
          data-test-subj={`${testSubjPrefix}Card-${suggestion.id}`}
        >
          <EuiSpacer size="s" />
          <SuggestionBadges suggestion={suggestion} />
        </EuiCard>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
