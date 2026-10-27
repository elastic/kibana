/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTextColor,
  useEuiFontSize,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../../common/constants';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useBoostExplanation } from '../../hooks/use_boost_state';
import { ProfileLink } from './boost_page_links';
import { EditRuleFlyout } from './edit_rule_flyout';
import {
  ExplanationError,
  LOADING_LABEL,
  NO_RULE_LABEL,
  USING_PROFILE_LABEL,
} from './explanation_status';

interface CardPartProps {
  /** The index, whose boost a backing index's data stream decides. */
  indexName: string;
}

/** The rule that applies, as large as the other cards' values, beside the button that edits it. */
export const CardRule = ({ indexName }: CardPartProps) => {
  const largeFontSize = useEuiFontSize('l').fontSize;
  const { data: explanation, isLoading, isError } = useBoostExplanation(indexName);
  if (isLoading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {LOADING_LABEL}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  if (isError || !explanation) {
    return (
      <EuiText size="s">
        <ExplanationError />
      </EuiText>
    );
  }
  const [rule] = explanation.matches;
  // Index Management leaves the card out where boost doesn't apply, unless it couldn't tell.
  if (!rule) {
    return (
      <EuiText size="s" color="subdued">
        {NO_RULE_LABEL}
      </EuiText>
    );
  }
  return (
    <EuiText css={{ fontSize: largeFontSize }} data-test-subj="boostIndexCardRule">
      {rule.name}
    </EuiText>
  );
};

/**
 * Edits the rule that applies, the one change that's always possible: Elastic-managed profiles
 * can't change, but the rule can apply another. Or retries a failed request.
 */
export const CardActions = ({ indexName }: CardPartProps) => {
  const {
    application: { capabilities },
  } = useBoostServices();
  const canEdit = capabilities[PLUGIN_ID]?.save === true;
  const { data: explanation, isError, refetch } = useBoostExplanation(indexName);
  const [isEditing, setIsEditing] = useState(false);

  if (isError) {
    return (
      <EuiButton color="warning" onClick={() => refetch()} data-test-subj="boostIndexCardReload">
        {i18n.translate('xpack.boost.indexCard.reload', { defaultMessage: 'Reload' })}
      </EuiButton>
    );
  }
  const [rule] = explanation?.matches ?? [];
  if (!rule || !canEdit) {
    return null;
  }
  return (
    <>
      <EuiButton
        size="s"
        onClick={() => setIsEditing(true)}
        data-test-subj="boostIndexCardEditRule"
      >
        {i18n.translate('xpack.boost.indexCard.editRule', { defaultMessage: 'Edit rule' })}
      </EuiButton>
      {isEditing && <EditRuleFlyout rule={rule} onClose={() => setIsEditing(false)} />}
    </>
  );
};

/** The profile the rule applies, labeled like the other cards' footers. */
export const CardProfile = ({ indexName }: CardPartProps) => {
  const { data: explanation } = useBoostExplanation(indexName);
  if (!explanation?.boost_profile) {
    return null;
  }
  // In a narrow card, the profile wraps below its label rather than squeezing it.
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiIcon type="chartGauge" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTextColor color="default">{USING_PROFILE_LABEL}</EuiTextColor>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ProfileLink profileName={explanation.boost_profile} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
