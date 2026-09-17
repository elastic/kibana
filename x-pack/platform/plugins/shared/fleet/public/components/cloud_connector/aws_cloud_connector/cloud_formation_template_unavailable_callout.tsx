/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { TemplateContextField } from '../utils';

export const CLOUD_FORMATION_TEMPLATE_UNAVAILABLE_CALLOUT_TEST_SUBJ =
  'cloudFormationTemplateUnavailableCallout';

const FIELD_LABELS: Record<TemplateContextField, string> = {
  accountType: i18n.translate('xpack.fleet.cloudConnector.aws.templateUnavailable.accountType', {
    defaultMessage: 'account type',
  }),
  resourceId: i18n.translate('xpack.fleet.cloudConnector.aws.templateUnavailable.resourceId', {
    defaultMessage: 'deployment or project ID',
  }),
  organizationId: i18n.translate(
    'xpack.fleet.cloudConnector.aws.templateUnavailable.organizationId',
    { defaultMessage: 'Elastic Cloud organization ID' }
  ),
  cloudProvider: i18n.translate(
    'xpack.fleet.cloudConnector.aws.templateUnavailable.cloudProvider',
    { defaultMessage: 'cloud provider' }
  ),
  cloudRegion: i18n.translate('xpack.fleet.cloudConnector.aws.templateUnavailable.cloudRegion', {
    defaultMessage: 'cloud region',
  }),
};

export interface CloudFormationTemplateUnavailableCalloutProps {
  missingContext: TemplateContextField[];
}

export const CloudFormationTemplateUnavailableCallout: React.FC<
  CloudFormationTemplateUnavailableCalloutProps
> = ({ missingContext }) => {
  const missing = missingContext.map((field) => FIELD_LABELS[field]).join(', ');

  return (
    <EuiCallOut
      announceOnMount
      size="s"
      color="warning"
      iconType="warning"
      data-test-subj={CLOUD_FORMATION_TEMPLATE_UNAVAILABLE_CALLOUT_TEST_SUBJ}
      title={
        <FormattedMessage
          id="xpack.fleet.cloudConnector.aws.templateUnavailable.title"
          defaultMessage="The CloudFormation template cannot be launched from here"
        />
      }
    >
      {missing ? (
        <FormattedMessage
          id="xpack.fleet.cloudConnector.aws.templateUnavailable.missingContext"
          defaultMessage="Kibana could not determine the {missing} of this Elastic Cloud deployment or project, so the stack parameters cannot be pre-filled. Identity Federation is available for deployments and projects running on Elastic Cloud."
          values={{ missing }}
        />
      ) : (
        <FormattedMessage
          id="xpack.fleet.cloudConnector.aws.templateUnavailable.generic"
          defaultMessage="Kibana could not determine the Elastic Cloud details required to pre-fill the stack parameters. Identity Federation is available for deployments and projects running on Elastic Cloud."
        />
      )}
    </EuiCallOut>
  );
};
