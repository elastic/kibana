/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiTextColor } from '@elastic/eui';
import { useBoostExplanation } from '../../hooks/use_boost_state';
import { ProfileLink, RuleLink } from './boost_page_links';
import { ExplanationError, LOADING_LABEL, NO_RULE_LABEL } from './explanation_status';

interface DataStreamBoostDetailProps {
  dataStreamName: string;
  detail: 'profile' | 'rule';
}

/** A data stream flyout detail's value: the profile or rule that applies, or why there isn't one. */
export const DataStreamBoostDetail = ({ dataStreamName, detail }: DataStreamBoostDetailProps) => {
  const { data: explanation, isLoading, isError } = useBoostExplanation(dataStreamName);
  if (isLoading) {
    return <EuiLoadingSpinner size="s" aria-label={LOADING_LABEL} />;
  }
  if (isError || !explanation) {
    return <ExplanationError />;
  }
  const [rule] = explanation.matches;
  if (!rule) {
    return <EuiTextColor color="subdued">{NO_RULE_LABEL}</EuiTextColor>;
  }
  return detail === 'profile' ? (
    <ProfileLink profileName={rule.boost_profile} />
  ) : (
    <RuleLink rule={rule} />
  );
};
