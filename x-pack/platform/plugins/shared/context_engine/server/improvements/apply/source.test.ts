/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { AiIndexHttpItem, AiIndexSource } from '../../../common/http_api/ai_indices';
import type { AiIndexService } from '../../ai_indices/service';
import { validateConnectorSources } from '../../ai_indices/validate_connector_sources';
import { ApplyImprovementError } from './errors';
import { addSource, editSource, removeSource } from './source';

jest.mock('../../ai_indices/validate_connector_sources');

const validateConnectorSourcesMock = validateConnectorSources as jest.MockedFunction<
  typeof validateConnectorSources
>;

const actions = {} as ActionsPluginStart;
const request = httpServerMock.createKibanaRequest();

const esqlSource: AiIndexSource = { type: 'esql', value: 'FROM logs-*' };
const connectorSource: AiIndexSource = { type: 'connector', value: 'connector-1' };

const aiIndex = (sources: AiIndexSource[]): AiIndexHttpItem => ({
  id: 'support',
  description: 'Support knowledge',
  managed: false,
  dest: { type: 'index', value: 'ai-index-support' },
  automations: [{ type: 'workflow', value: 'wf-1' }],
  sources,
  date_created: '2026-08-01T00:00:00.000Z',
  date_modified: '2026-08-01T00:00:00.000Z',
});

const createContext = (sources: AiIndexSource[]) => {
  const aiIndexService = {
    get: jest.fn().mockResolvedValue(aiIndex(sources)),
    put: jest.fn().mockResolvedValue('updated'),
  } as unknown as jest.Mocked<AiIndexService>;

  return { aiIndexService, aiIndexId: 'support', actions, request };
};

beforeEach(() => {
  jest.clearAllMocks();
  validateConnectorSourcesMock.mockResolvedValue(undefined);
});

describe('addSource', () => {
  it('appends the source and keeps the rest of the AI index intact', async () => {
    const context = createContext([esqlSource]);

    const id = await addSource(context, connectorSource);

    expect(id).toBe('connector-1');
    expect(context.aiIndexService.put).toHaveBeenCalledWith('support', {
      description: 'Support knowledge',
      dest: { type: 'index', value: 'ai-index-support' },
      automations: [{ type: 'workflow', value: 'wf-1' }],
      sources: [esqlSource, connectorSource],
    });
  });

  it('treats an identical source as already added rather than duplicating it', async () => {
    const context = createContext([esqlSource]);

    await addSource(context, esqlSource);

    expect(context.aiIndexService.put).not.toHaveBeenCalled();
  });

  it('validates connector sources under the approving user before writing', async () => {
    const context = createContext([]);
    validateConnectorSourcesMock.mockRejectedValue(new Error('Connector not found'));

    await expect(addSource(context, connectorSource)).rejects.toThrow('Connector not found');
    expect(context.aiIndexService.put).not.toHaveBeenCalled();
  });
});

describe('editSource', () => {
  it('replaces the targeted source', async () => {
    const context = createContext([esqlSource, connectorSource]);

    const id = await editSource(context, 'FROM logs-*', {
      type: 'esql',
      value: 'FROM logs-2026-*',
    });

    expect(id).toBe('FROM logs-2026-*');
    expect(context.aiIndexService.put).toHaveBeenCalledWith(
      'support',
      expect.objectContaining({
        sources: [{ type: 'esql', value: 'FROM logs-2026-*' }, connectorSource],
      })
    );
  });

  it('explains when the source it edits is already gone', async () => {
    const context = createContext([connectorSource]);

    await expect(editSource(context, 'FROM logs-*', esqlSource)).rejects.toThrow(
      ApplyImprovementError
    );
    expect(context.aiIndexService.put).not.toHaveBeenCalled();
  });
});

describe('removeSource', () => {
  it('drops the source and leaves the others', async () => {
    const context = createContext([esqlSource, connectorSource]);

    const id = await removeSource(context, 'FROM logs-*');

    expect(id).toBe('FROM logs-*');
    expect(context.aiIndexService.put).toHaveBeenCalledWith(
      'support',
      expect.objectContaining({ sources: [connectorSource] })
    );
  });

  it('explains when the source it removes is already gone', async () => {
    const context = createContext([connectorSource]);

    await expect(removeSource(context, 'FROM logs-*')).rejects.toThrow(ApplyImprovementError);
    expect(context.aiIndexService.put).not.toHaveBeenCalled();
  });
});
