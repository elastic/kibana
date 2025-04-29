/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ActionTypeModel } from '../../../..';

export const ReadOnlyConnectorMessage: React.FC<{
  connectorId: string;
  connectorName: string;
  extraComponent?: ActionTypeModel['actionReadOnlyExtraComponent'];
  href: string;
}> = ({ connectorId, connectorName, extraComponent, href }) => {
  const ExtraComponent = extraComponent;
  return (
    <>
      <EuiText>
        {i18n.translate('xpack.triggersActionsUI.sections.editConnectorForm.descriptionText', {
          defaultMessage: 'This connector is read-only.',
        })}
      </EuiText>
      <EuiLink data-test-subj="read-only-link" href={href} target="_blank">
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.editConnectorForm.preconfiguredHelpLabel"
          defaultMessage="Learn more about preconfigured connectors."
        />
      </EuiLink>
      {ExtraComponent && (
        <>
          <EuiSpacer size="m" />
          <ExtraComponent connectorId={connectorId} connectorName={connectorName} />
        </>
      )}
    </>
  );
};
