/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ActionTypeModel } from '../../../..';

export const ReadOnlyConnectorMessage: React.FC<{
  connectorId: string;
  connectorName: string;
  extraComponent?: ActionTypeModel['actionReadOnlyExtraComponent'];
  href: string;
}> = ({ connectorId, connectorName, extraComponent, href }) => {
  const ExtraComponent = extraComponent;
  return (
    <EuiText size="s">
      <p>
        {i18n.translate('xpack.triggersActionsUI.sections.editConnectorForm.descriptionText', {
          defaultMessage: 'This connector is read-only.',
        })}
      </p>
      <p>
        <EuiLink data-test-subj="read-only-link" href={href} target="_blank">
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.editConnectorForm.preconfiguredHelpLabel"
            defaultMessage="Learn more about preconfigured connectors."
          />
        </EuiLink>
      </p>
      {ExtraComponent && (
        <Suspense fallback={null}>
          <ExtraComponent connectorId={connectorId} connectorName={connectorName} />
        </Suspense>
      )}
    </EuiText>
  );
};
