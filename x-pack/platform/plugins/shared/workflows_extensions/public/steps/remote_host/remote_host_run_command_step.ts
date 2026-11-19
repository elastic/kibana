/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SshConnectorTypeId as SSH_CONNECTOR_ID } from '@kbn/connector-schemas';
import { remoteHostRunCommandStepCommonDefinition } from '../../../common/steps/remote_host';
import { createPublicStepDefinition } from '../../step_registry/types';

export const remoteHostRunCommandStepDefinition = createPublicStepDefinition({
  ...remoteHostRunCommandStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/app_console').then(({ icon }) => ({
      default: icon,
    }))
  ),
  editorHandlers: {
    config: {
      'connector-id': {
        connectorIdSelection: {
          connectorTypes: [SSH_CONNECTOR_ID],
          enableCreation: true,
        },
      },
    },
  },
});
