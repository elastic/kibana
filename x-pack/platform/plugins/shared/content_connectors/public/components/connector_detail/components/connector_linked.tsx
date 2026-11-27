/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { KbnSuccessCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';

export const ConnectorLinked: React.FC = () => {
  return (
    <KbnSuccessCallout
      title={i18n.translate(
        'xpack.contentConnectors.content.connector_detail.configurationConnector.steps.connectorLinked.callout.title',
        {
          defaultMessage: 'Content crawler connected',
        }
      )}
      text={i18n.translate(
        'xpack.contentConnectors.content.connector_detail.configurationConnector.steps.connectorLinked.callout.description',
        {
          defaultMessage:
            'Congratulations. Looks like your content crawler is deployed and connected.',
        }
      )}
    />
  );
};
