/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText, EuiTextColor } from '@elastic/eui';
import { useBoostExplanation } from '../../hooks/use_boost_state';
import { ProfileLink, RuleLink } from './boost_page_links';
import { EditRuleFlyout } from './edit_rule_flyout';
import {
  ExplanationError,
  LOADING_LABEL,
  NO_RULE_LABEL,
  USING_PROFILE_LABEL,
} from './explanation_status';

interface DataStreamBoostProps {
  dataStreamName: string;
}

/**
 * A data stream's boost in its details flyout, as on an index's overview card: the rule that
 * applies, then the profile it uses, laid out like the flyout's lifecycle details. Or why there
 * isn't one.
 */
export const DataStreamBoostDetail = ({ dataStreamName }: DataStreamBoostProps) => {
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
  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <RuleLink rule={rule} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {/* The profile wraps below its label in a narrow flyout, rather than squeezing it. */}
        <EuiText size="xs" color="subdued">
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>{USING_PROFILE_LABEL}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ProfileLink profileName={rule.boost_profile} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface EditDataStreamRuleProps extends DataStreamBoostProps {
  onClose: () => void;
}

/**
 * Edits the rule that applies to a data stream, from its details flyout's menu, in place of the
 * flyout. With no rule to edit, or none loaded, it closes again.
 */
export const EditDataStreamRule = ({ dataStreamName, onClose }: EditDataStreamRuleProps) => {
  const { data: explanation, isLoading } = useBoostExplanation(dataStreamName);
  const [rule] = explanation?.matches ?? [];
  const hasNothingToEdit = !isLoading && !rule;
  useEffect(() => {
    if (hasNothingToEdit) {
      onClose();
    }
  }, [hasNothingToEdit, onClose]);
  return rule ? <EditRuleFlyout rule={rule} onClose={onClose} /> : null;
};
