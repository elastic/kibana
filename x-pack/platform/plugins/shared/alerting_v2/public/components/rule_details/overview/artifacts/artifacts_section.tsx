/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionPoliciesArtifactsSubsection } from './action_policies_artifacts_subsection';
import { DashboardArtifactsSubsection } from './dashboard_artifacts_subsection';

export const ArtifactsSection: React.FC = () => {
  const artifactsAccordionId = useGeneratedHtmlId({ prefix: 'ruleArtifactsSection' });

  return (
    <EuiAccordion
      id={artifactsAccordionId}
      data-test-subj="ruleArtifactsSection"
      buttonContent={
        <EuiText size="s">
          <strong>
            {i18n.translate('xpack.alertingV2.ruleDetails.artifacts.title', {
              defaultMessage: 'Artifacts',
            })}
          </strong>
        </EuiText>
      }
      paddingSize="m"
      initialIsOpen
    >
      <EuiFlexGroup gutterSize="l" responsive={true} data-test-subj="ruleArtifactsSubsectionsRow">
        <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
          <DashboardArtifactsSubsection />
        </EuiFlexItem>
        <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
          <ActionPoliciesArtifactsSubsection />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};
