/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { EmptyPrompt } from '../../../components/prompts/empty_prompt';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { NoPermissionPrompt } from '../../../components/prompts/no_permission_prompt';

interface RulesListPromptsProps {
  showSpinner: boolean;
  showNoAuthPrompt: boolean;
  showCreateFirstRulePrompt: boolean;
  showCreateRuleButtonInPrompt: boolean;
  onCreateRulesClick: () => void;
}

export const RulesListPrompts = (props: RulesListPromptsProps) => {
  const {
    showNoAuthPrompt,
    showSpinner,
    showCreateRuleButtonInPrompt,
    showCreateFirstRulePrompt,
    onCreateRulesClick,
  } = props;
  if (showNoAuthPrompt) return <NoPermissionPrompt />;

  if (showCreateFirstRulePrompt) {
    return (
      <EmptyPrompt
        showCreateRule={showCreateRuleButtonInPrompt}
        onCreateRulesClick={onCreateRulesClick}
      />
    );
  }
  if (showSpinner) {
    return (
      <EuiPageTemplate.Section grow={false} paddingSize="none">
        <CenterJustifiedSpinner />
      </EuiPageTemplate.Section>
    );
  }

  return null;
};
