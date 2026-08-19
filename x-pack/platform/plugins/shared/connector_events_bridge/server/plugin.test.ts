/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';

import { ConnectorEventsBridgePlugin, type ConnectorEventsBridgeStartDeps } from './plugin';

describe('ConnectorEventsBridgePlugin', () => {
  const createPlugin = () => {
    const logger = loggingSystemMock.createLogger();
    const initializerContext = {
      logger: { get: () => logger },
    } as unknown as ConstructorParameters<typeof ConnectorEventsBridgePlugin>[0];
    return { plugin: new ConnectorEventsBridgePlugin(initializerContext), logger };
  };

  it('does not register when inbound events are disabled', () => {
    const { plugin, logger } = createPlugin();
    const actions = actionsMock.createSetup();
    const configUtils = actionsConfigMock.create();
    configUtils.isInboundEventsEnabled.mockReturnValue(false);
    actions.getActionsConfigurationUtilities.mockReturnValue(configUtils);

    const core = {
      getStartServices: jest.fn(),
    } as unknown as CoreSetup<ConnectorEventsBridgeStartDeps>;

    plugin.setup(core, { actions });

    expect(actions.registerConnectorEventEmitter).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('registers the workflows emitter when inbound events are enabled', () => {
    const { plugin, logger } = createPlugin();
    const actions = actionsMock.createSetup();
    const configUtils = actionsConfigMock.create();
    configUtils.isInboundEventsEnabled.mockReturnValue(true);
    actions.getActionsConfigurationUtilities.mockReturnValue(configUtils);

    const core = {
      getStartServices: jest.fn().mockResolvedValue([{}, { workflowsExtensions: undefined }]),
    } as unknown as CoreSetup<ConnectorEventsBridgeStartDeps>;

    plugin.setup(core, { actions });

    expect(actions.registerConnectorEventEmitter).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Inbound events enabled; registering connector event emitter'
    );
  });
});
