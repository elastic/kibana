/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DashboardArtifactsSubsection } from './dashboard_artifacts_subsection';

/**
 * Artifacts section for `signal` rules. Signal rules have no notification
 * policies, so only the dashboards subsection is shown, at full width.
 */
export const SignalArtifactsSection: React.FC = () => {
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
      initialIsOpen
    >
      <DashboardArtifactsSubsection />
    </EuiAccordion>
  );
};
