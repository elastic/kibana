/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWatch } from 'react-hook-form';
import { EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import { RuleDetailsFieldGroup } from '../../../form';
import type { FormValues } from '../../../form/types';
import { ReasonField } from '../../../form/fields/reason_field';
import { RelatedDashboardSelector, RunbookArtifactField } from '../../../form/field_groups';

export function DetailsAndArtifactsStep() {
  const kind = useWatch<FormValues, 'kind'>({ name: 'kind' });

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
      {kind === 'alert' && <ReasonField />}

      <EuiHorizontalRule margin="m" />

      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.alertingV2.composeDiscover.detailsAndArtifacts.artifactsTitle"
            defaultMessage="Artifacts"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <RunbookArtifactField />
      <EuiSpacer size="m" />
      <RelatedDashboardSelector />
    </>
  );
}
