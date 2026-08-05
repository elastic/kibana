/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock, actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { ActionResult } from '@kbn/actions-plugin/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { DATA_CONNECTOR_TYPE_IDS } from '../../common/data_connectors';
import type { AiIndexSource } from '../../common/http_api/ai_indices';
import { InvalidConnectorSourceError } from './errors';
import { validateConnectorSources } from './validate_connector_sources';

const buildConnector = (id: string, actionTypeId: string): ActionResult => ({
  id,
  actionTypeId,
  name: `Connector ${id}`,
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
});

describe('validateConnectorSources', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let actions: ReturnType<typeof actionsMock.createStart>;
  const request = httpServerMock.createKibanaRequest();

  const validate = (sources: AiIndexSource[]) =>
    validateConnectorSources({ sources, actions, request });

  beforeEach(() => {
    actionsClient = actionsClientMock.create();
    actions = actionsMock.createStart();
    actions.getActionsClientWithRequest.mockResolvedValue(actionsClient);
  });

  it('resolves without touching the actions client when there are no connector sources', async () => {
    await expect(validate([{ type: 'esql', value: 'FROM foo' }])).resolves.toBeUndefined();

    expect(actions.getActionsClientWithRequest).not.toHaveBeenCalled();
  });

  it('resolves without touching the actions client when there are no sources at all', async () => {
    await expect(validate([])).resolves.toBeUndefined();

    expect(actions.getActionsClientWithRequest).not.toHaveBeenCalled();
  });

  it('accepts connectors whose type is on the data connector allowlist', async () => {
    actionsClient.getBulk.mockResolvedValue([buildConnector('gd-1', '.google_drive')]);

    await expect(validate([{ type: 'connector', value: 'gd-1' }])).resolves.toBeUndefined();

    expect(actionsClient.getBulk).toHaveBeenCalledWith({ ids: ['gd-1'] });
  });

  it.each(DATA_CONNECTOR_TYPE_IDS)('accepts %s connectors', async (connectorTypeId) => {
    actionsClient.getBulk.mockResolvedValue([buildConnector('c-1', connectorTypeId)]);

    await expect(validate([{ type: 'connector', value: 'c-1' }])).resolves.toBeUndefined();
  });

  it('uses the request-scoped actions client', async () => {
    actionsClient.getBulk.mockResolvedValue([buildConnector('gd-1', '.google_drive')]);

    await validate([{ type: 'connector', value: 'gd-1' }]);

    expect(actions.getActionsClientWithRequest).toHaveBeenCalledWith(request);
  });

  it('deduplicates connector ids before looking them up', async () => {
    actionsClient.getBulk.mockResolvedValue([buildConnector('gd-1', '.google_drive')]);

    await validate([
      { type: 'connector', value: 'gd-1' },
      { type: 'connector', value: 'gd-1' },
    ]);

    expect(actionsClient.getBulk).toHaveBeenCalledWith({ ids: ['gd-1'] });
  });

  it('only looks up connector sources, ignoring es|ql ones', async () => {
    actionsClient.getBulk.mockResolvedValue([buildConnector('gh-1', '.github')]);

    await validate([
      { type: 'esql', value: 'FROM foo' },
      { type: 'connector', value: 'gh-1' },
    ]);

    expect(actionsClient.getBulk).toHaveBeenCalledWith({ ids: ['gh-1'] });
  });

  it('rejects connectors whose type is not a data connector', async () => {
    actionsClient.getBulk.mockResolvedValue([buildConnector('slack-1', '.slack')]);

    await expect(validate([{ type: 'connector', value: 'slack-1' }])).rejects.toThrow(
      new InvalidConnectorSourceError(
        'Connector [slack-1] of type [.slack] cannot be used as an AI index source'
      )
    );
  });

  it('rejects when a connector id is not returned by the actions client', async () => {
    actionsClient.getBulk.mockResolvedValue([buildConnector('gd-1', '.google_drive')]);

    await expect(
      validate([
        { type: 'connector', value: 'gd-1' },
        { type: 'connector', value: 'missing-1' },
      ])
    ).rejects.toThrow(new InvalidConnectorSourceError('Connector [missing-1] was not found'));
  });

  it('rejects with a generic message when the actions client lookup fails', async () => {
    actionsClient.getBulk.mockRejectedValue(new Error('Failed to load action missing-1 (404)'));

    await expect(validate([{ type: 'connector', value: 'missing-1' }])).rejects.toThrow(
      new InvalidConnectorSourceError('Unable to resolve connector sources: missing-1')
    );
  });

  it('rejects the first disallowed connector when several are provided', async () => {
    actionsClient.getBulk.mockResolvedValue([
      buildConnector('gd-1', '.google_drive'),
      buildConnector('slack-1', '.slack'),
    ]);

    await expect(
      validate([
        { type: 'connector', value: 'gd-1' },
        { type: 'connector', value: 'slack-1' },
      ])
    ).rejects.toThrow(InvalidConnectorSourceError);
  });
});
