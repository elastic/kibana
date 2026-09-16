/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWatch } from 'react-hook-form';
import {
  EuiAccordion,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { RuleDetailsFieldGroup } from '../../../form';
import { RelatedDashboardSelector, RunbookArtifactField } from '../../../form/field_groups';
import type { FormValues } from '../../../form/types';
import { LinkedActionPoliciesMatchingSection } from './linked_action_policies_step';

interface Props {
  ruleId?: string;
}

export function DetailsAndArtifactsStep({ ruleId }: Props) {
  const artifactsAccordionId = useGeneratedHtmlId({ prefix: 'composeDiscoverArtifacts' });
  const kind = useWatch<FormValues, 'kind'>({ name: 'kind' });
  const showActionPolicies = kind === 'alert';

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.alertingV2.composeDiscover.detailsAndArtifacts.ruleDetailsTitle"
            defaultMessage="Rule details"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {/* Name, description, tags -- connected to RHF via useFormContext() internally */}
      <RuleDetailsFieldGroup />

      {showActionPolicies && (
        <>
          <EuiHorizontalRule margin="m" />
          <LinkedActionPoliciesMatchingSection ruleId={ruleId} />
        </>
      )}
      <EuiHorizontalRule margin="m" />

      <EuiAccordion
        id={artifactsAccordionId}
        initialIsOpen={false}
        paddingSize="s"
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.composeDiscover.detailsAndArtifacts.artifactsTitle"
                defaultMessage="Artifacts"
              />
            </h3>
          </EuiTitle>
        }
        data-test-subj="composeDiscoverArtifactsAccordion"
      >
        <RunbookArtifactField />
        <EuiSpacer size="m" />
        <RelatedDashboardSelector />
      </EuiAccordion>
    </>
  );
}
