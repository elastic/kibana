/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';
import { getAwsStackConsoleUrl, INVALID_STACK_ARN_MESSAGE } from '../utils';

export interface IacTemplateDetailsProps {
  iacDeploymentId: string;
  isDeploymentIdInvalid: boolean;
  onIacDeploymentIdChange: (value: string) => void;
}

/**
 * Editable deployment ID (stack ARN) plus a read-only stack console link. The template key is
 * not shown: it is written by the render flow and the daily check, never by hand.
 */
export const IacTemplateDetails: React.FC<IacTemplateDetailsProps> = ({
  iacDeploymentId,
  isDeploymentIdInvalid,
  onIacDeploymentIdChange,
}) => {
  const { IAC_SECTION, IAC_DEPLOYMENT_ID_INPUT, IAC_VIEW_STACK_LINK } =
    CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS;

  const stackConsoleUrl = getAwsStackConsoleUrl(iacDeploymentId || undefined);

  return (
    <section data-test-subj={IAC_SECTION}>
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.iacTitle', {
            defaultMessage: 'IaC template',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.iacDeploymentIdLabel', {
          defaultMessage: 'Deployment ID',
        })}
        helpText={i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.iacDeploymentIdHelp', {
          defaultMessage: 'Paste the stack ARN from the CloudFormation console.',
        })}
        isInvalid={isDeploymentIdInvalid}
        error={isDeploymentIdInvalid ? INVALID_STACK_ARN_MESSAGE : undefined}
      >
        <EuiFieldText
          fullWidth
          value={iacDeploymentId}
          onChange={(e) => onIacDeploymentIdChange(e.target.value.trim())}
          isInvalid={isDeploymentIdInvalid}
          data-test-subj={IAC_DEPLOYMENT_ID_INPUT}
        />
      </EuiFormRow>
      {stackConsoleUrl && (
        <EuiText size="s">
          <EuiLink
            href={stackConsoleUrl}
            target="_blank"
            external
            data-test-subj={IAC_VIEW_STACK_LINK}
          >
            {i18n.translate('xpack.fleet.cloudConnector.policiesFlyout.viewStackLink', {
              defaultMessage: 'View stack in CloudFormation',
            })}
          </EuiLink>
        </EuiText>
      )}
    </section>
  );
};
