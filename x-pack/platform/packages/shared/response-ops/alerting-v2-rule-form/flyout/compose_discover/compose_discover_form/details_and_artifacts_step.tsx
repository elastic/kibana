/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFieldText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { RuleDetailsFieldGroup } from '../../../form';

export function DetailsAndArtifactsStep() {
  return (
    <>
      {/* Name, description, tags -- connected to RHF via useFormContext() internally */}
      <RuleDetailsFieldGroup />

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

      {/* TODO (#268770): wire runbook URL and dashboard link to FormValues.artifacts */}
      <EuiFormRow
        label={i18n.translate(
          'xpack.alertingV2.composeDiscover.detailsAndArtifacts.runbookUrlLabel',
          { defaultMessage: 'Runbook URL' }
        )}
        fullWidth
        labelAppend={
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.alertingV2.composeDiscover.detailsAndArtifacts.optionalLabel"
              defaultMessage="Optional"
            />
          </EuiText>
        }
      >
        <EuiFieldText fullWidth placeholder="https://..." disabled />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate(
          'xpack.alertingV2.composeDiscover.detailsAndArtifacts.dashboardLinkLabel',
          { defaultMessage: 'Dashboard link' }
        )}
        fullWidth
        labelAppend={
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.alertingV2.composeDiscover.detailsAndArtifacts.dashboardOptionalLabel"
              defaultMessage="Optional"
            />
          </EuiText>
        }
      >
        <EuiFieldText fullWidth placeholder="https://..." disabled />
      </EuiFormRow>
    </>
  );
}
