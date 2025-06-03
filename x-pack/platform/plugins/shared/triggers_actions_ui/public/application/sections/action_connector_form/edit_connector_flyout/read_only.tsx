/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ActionTypeModel, useKibana } from '../../../..';

const ElasticLLMReadOnlyConnectorMessage: React.FC<{ href: string }> = ({ href }) => {
  const { docLinks } = useKibana().services;
  return (
    <EuiText size="xs">
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.editConnectorForm.esLLM.descriptionText"
        defaultMessage="This Elastic-managed connector is read-only. Learn more about {elasticLLM} and its {usageCost}."
        values={{
          elasticLLM: (
            <EuiLink
              data-test-subj="read-only-link"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              external
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.editConnectorForm.esLLM.title.link"
                defaultMessage="Elastic Managed LLM connector"
              />
            </EuiLink>
          ),
          usageCost: (
            <EuiLink
              href={docLinks.links.alerting.elasticManagedLlmUsageCost}
              target="_blank"
              rel="noopener noreferrer"
              external
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.editConnectorForm.esLLM.usageCost.link"
                defaultMessage="usage cost"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
};

export const ReadOnlyConnectorMessage: React.FC<{
  connectorId: string;
  connectorName: string;
  extraComponent?: ActionTypeModel['actionReadOnlyExtraComponent'];
  href: string;
}> = ({ connectorId, connectorName, extraComponent, href }) => {
  const ExtraComponent = extraComponent;
  return (
    <>
      <ElasticLLMReadOnlyConnectorMessage href={href} />
      {ExtraComponent && (
        <>
          <EuiSpacer size="m" />
          <ExtraComponent connectorId={connectorId} connectorName={connectorName} />
        </>
      )}
    </>
  );
};
