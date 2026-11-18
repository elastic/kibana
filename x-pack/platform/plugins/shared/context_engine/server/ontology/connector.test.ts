/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectorSpec } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import {
  callConnector,
  connectorFieldsOf,
  connectorFingerprintOf,
  renderSample,
  resolveConnectorSource,
  type ConnectorActionsClient,
} from './connector';

jest.mock('@kbn/connector-specs', () => ({
  ...jest.requireActual('@kbn/connector-specs'),
  getConnectorSpec: jest.fn(),
}));

const action = (
  scope: 'read' | 'write',
  input: z.ZodType = z.object({ query: z.string().optional() })
) => ({
  isTool: true,
  scope,
  input,
  description: `A ${scope} action`,
  handler: jest.fn(),
});

const spec = {
  metadata: { id: '.google_drive', description: 'Google Drive files.' },
  skill: 'Search with searchFiles first.',
  actions: {
    searchFiles: action('read'),
    downloadFile: action('read', z.object({ fileId: z.string() })),
    deleteFile: action('write'),
    internalOnly: { ...action('read'), isTool: false },
  },
};

const clientFor = ({
  selectedActions,
  execute = jest.fn(async () => ({ status: 'ok', data: { files: [] } })),
}: {
  selectedActions?: string[];
  execute?: jest.Mock;
} = {}) =>
  ({
    get: jest.fn(async () => ({
      id: 'drive-1',
      name: 'Team drive',
      actionTypeId: '.google_drive',
      config: { selectedActions },
    })),
    execute,
  } as unknown as ConnectorActionsClient & { execute: jest.Mock });

describe('resolveConnectorSource', () => {
  beforeEach(() => {
    jest.mocked(getConnectorSpec).mockReturnValue(spec as never);
  });

  it('lists the read sub-actions agents may call, with their params', async () => {
    const info = await resolveConnectorSource(clientFor(), 'drive-1');

    expect(info).toEqual(
      expect.objectContaining({
        id: 'drive-1',
        name: 'Team drive',
        type: '.google_drive',
        description: 'Google Drive files.',
        skill: 'Search with searchFiles first.',
      })
    );
    expect(info.tools.map(({ name }) => name)).toEqual(['searchFiles', 'downloadFile']);
    expect(JSON.parse(info.tools[1].parameters)).toEqual(
      expect.objectContaining({ required: ['fileId'] })
    );
  });

  it('honors the sub-actions selected on the connector', async () => {
    const info = await resolveConnectorSource(
      clientFor({ selectedActions: ['downloadFile', 'deleteFile'] }),
      'drive-1'
    );

    expect([...info.readActions.keys()]).toEqual(['downloadFile']);
  });

  it('changes its fingerprint only when the read sub-actions change', async () => {
    const info = await resolveConnectorSource(clientFor(), 'drive-1');
    const narrowed = await resolveConnectorSource(
      clientFor({ selectedActions: ['searchFiles'] }),
      'drive-1'
    );

    expect(connectorFingerprintOf(info)).toBe(
      connectorFingerprintOf({ type: info.type, tools: [...info.tools].reverse() })
    );
    expect(connectorFingerprintOf(narrowed)).not.toBe(connectorFingerprintOf(info));
  });
});

describe('callConnector', () => {
  beforeEach(() => {
    jest.mocked(getConnectorSpec).mockReturnValue(spec as never);
  });

  it('runs a read sub-action with valid params as a connector sub-action', async () => {
    const client = clientFor();
    const info = await resolveConnectorSource(client, 'drive-1');

    await expect(callConnector(client, info, 'searchFiles', { query: 'budget' })).resolves.toEqual({
      ok: true,
      data: { files: [] },
    });
    expect(client.execute).toHaveBeenCalledWith({
      actionId: 'drive-1',
      params: { subAction: 'searchFiles', subActionParams: { query: 'budget' } },
    });
  });

  it('never runs a write sub-action, or one with invalid params, and reports failures', async () => {
    const client = clientFor({
      execute: jest.fn(async () => ({
        status: 'error',
        message: 'an error occurred',
        serviceMessage: '403',
      })),
    });
    const info = await resolveConnectorSource(client, 'drive-1');

    await expect(callConnector(client, info, 'deleteFile', {})).resolves.toEqual({
      ok: false,
      error: "'deleteFile' is not a read sub-action of this connector",
    });
    await expect(callConnector(client, info, 'downloadFile', {})).resolves.toEqual(
      expect.objectContaining({ ok: false, error: expect.stringContaining('invalid params') })
    );
    expect(client.execute).not.toHaveBeenCalled();
    await expect(callConnector(client, info, 'searchFiles', {})).resolves.toEqual({
      ok: false,
      error: 'an error occurred: 403',
    });
  });
});

describe('connectorFieldsOf', () => {
  const data = {
    files: [
      { id: 'f1', name: 'Budget', owners: [{ emailAddress: 'ana@example.com' }], size: 10 },
      { id: 'f2', name: 'Plan', owners: [{ emailAddress: 'bo@example.com' }], size: 2.5 },
    ],
  };

  it('lists the record fields per sub-action with the values seen, except sensitive ones', () => {
    expect(connectorFieldsOf([{ sub_action: 'searchFiles', data }], true)).toEqual([
      {
        name: 'searchFiles.files.id',
        type: 'keyword',
        searchable: false,
        aggregatable: false,
        sample_values: ['f1', 'f2'],
      },
      {
        name: 'searchFiles.files.name',
        type: 'keyword',
        searchable: false,
        aggregatable: false,
        sample_values: ['Budget', 'Plan'],
      },
      {
        name: 'searchFiles.files.owners.emailAddress',
        type: 'keyword',
        searchable: false,
        aggregatable: false,
      },
      {
        name: 'searchFiles.files.size',
        type: 'double',
        searchable: false,
        aggregatable: false,
        sample_values: [10, 2.5],
      },
    ]);
  });

  it('keeps no values when value samples are off', () => {
    expect(
      connectorFieldsOf([{ sub_action: 'searchFiles', data }], false).some(
        (field) => 'sample_values' in field
      )
    ).toBe(false);
  });

  it('renders a sample, or only its shape when value samples are off', () => {
    expect(renderSample({ files: [{ id: 'f1', size: 2 }] }, true)).toBe(
      '{"files":[{"id":"f1","size":2}]}'
    );
    expect(renderSample({ files: [{ id: 'f1', size: 2 }] }, false)).toBe(
      '{"files":[{"id":"keyword","size":"long"}]}'
    );
  });
});
