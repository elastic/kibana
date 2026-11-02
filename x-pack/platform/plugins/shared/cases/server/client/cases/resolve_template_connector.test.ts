/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { ConnectorTypes } from '../../../common/types/domain';
import { resolveTemplateConnector } from './resolve_template_connector';

describe('resolveTemplateConnector', () => {
  const actionsClient = actionsClientMock.create();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    actionsClient.get.mockRejectedValue(new Error('not found'));
  });

  it('returns undefined when the template has no connector', async () => {
    await expect(
      resolveTemplateConnector(undefined, actionsClient, logger)
    ).resolves.toBeUndefined();
    expect(actionsClient.get).not.toHaveBeenCalled();
  });

  it('returns undefined for a .none connector without calling Actions', async () => {
    await expect(
      resolveTemplateConnector(
        { id: 'none', type: ConnectorTypes.none, fields: null },
        actionsClient,
        logger
      )
    ).resolves.toBeUndefined();
    expect(actionsClient.get).not.toHaveBeenCalled();
  });

  it('resolves the connector name from Actions', async () => {
    actionsClient.get.mockResolvedValue({ name: 'My Jira' } as Awaited<
      ReturnType<typeof actionsClient.get>
    >);

    await expect(
      resolveTemplateConnector(
        { id: 'jira-1', type: ConnectorTypes.jira, fields: null },
        actionsClient,
        logger
      )
    ).resolves.toEqual({
      id: 'jira-1',
      type: ConnectorTypes.jira,
      fields: null,
      name: 'My Jira',
    });
    expect(actionsClient.get).toHaveBeenCalledWith({ id: 'jira-1' });
  });

  it('returns undefined and logs when Actions cannot resolve the id', async () => {
    await expect(
      resolveTemplateConnector(
        { id: 'deleted-connector', type: ConnectorTypes.jira, fields: null },
        actionsClient,
        logger
      )
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Dropping template connector default "deleted-connector"')
    );
  });
});
