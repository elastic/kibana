/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConnectorTypeFromSpec } from '@kbn/actions-plugin/server/lib';
import {
  EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID,
  EXAMPLE_WEBHOOK_INSTANCE_ID,
} from '../common/constants';
import { WorkflowsConnectorEventsExamplePlugin } from './plugin';

jest.mock('@kbn/actions-plugin/server/lib', () => ({
  createConnectorTypeFromSpec: jest.fn((spec) => ({ id: spec.metadata.id })),
}));

describe('WorkflowsConnectorEventsExamplePlugin', () => {
  it('registers the connector type and a sales-ingress instance', () => {
    const actionsSetup = {
      registerType: jest.fn(),
      getActionsConfigurationUtilities: jest.fn(),
      getAxiosInstanceWithAuth: jest.fn(),
      getCredential: jest.fn(),
      getClientLeasePool: jest.fn(),
    };
    const actionsStart = {
      registerDynamicConnector: jest.fn().mockReturnValue(true),
      unregisterDynamicConnector: jest.fn().mockReturnValue(true),
    };

    const plugin = new WorkflowsConnectorEventsExamplePlugin();
    plugin.setup({} as never, { actions: actionsSetup as never });

    expect(createConnectorTypeFromSpec).toHaveBeenCalled();
    expect(actionsSetup.registerType).toHaveBeenCalledWith(
      expect.objectContaining({ id: EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID })
    );

    plugin.start({} as never, { actions: actionsStart as never });
    expect(actionsStart.registerDynamicConnector).toHaveBeenCalledWith(
      expect.objectContaining({
        id: EXAMPLE_WEBHOOK_INSTANCE_ID,
        actionTypeId: EXAMPLE_WEBHOOK_CONNECTOR_TYPE_ID,
        secrets: { authType: 'none' },
      })
    );

    plugin.stop();
    expect(actionsStart.unregisterDynamicConnector).toHaveBeenCalledWith(
      EXAMPLE_WEBHOOK_INSTANCE_ID
    );
  });
});
