/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const InboundEventsSaveToGenerateCalloutComponent: React.FC = () => (
  <KbnInfoCallout
    announceOnMount
    size="s"
    data-test-subj="inbound-events-save-to-generate"
    title={i18n.translate(
      'xpack.triggersActionsUI.sections.actionConnectorForm.inboundEventsSaveToGenerateTitle',
      { defaultMessage: 'Webhook URL and ingest token' }
    )}
    text={
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.actionConnectorForm.inboundEventsSaveToGenerateDescription"
        defaultMessage="Save this connector to generate the webhook URL and ingest token. The token is shown only once."
      />
    }
  />
);

export const InboundEventsSaveToGenerateCallout = memo(InboundEventsSaveToGenerateCalloutComponent);
