/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';
import type { NotificationInput } from '../common/types';
import { buildSubmitNotification, NotificationValidationError } from './submit';
import type { NotificationCenterPluginStart, NotificationCenterStartDependencies } from './types';

const validDraft: NotificationInput = {
  notification_id: 'inference:my-endpoint:deprecated',
  event_timestamp: '2026-07-09T12:00:00.000Z',
  type: 'modelStatus',
  title: 'Model deprecated',
  description: 'Your endpoint model is deprecated.',
  source_app_id: 'inference',
};

const setup = () => {
  const create = jest.fn().mockResolvedValue({ errors: false, items: [{ create: {} }] });
  const dataStreams = dataStreamServiceMock.createStartContract();
  dataStreams.initializeClient.mockResolvedValue({ create } as never);
  const core = {
    getStartServices: jest.fn().mockResolvedValue([{ dataStreams }]),
  } as unknown as CoreSetup<NotificationCenterStartDependencies, NotificationCenterPluginStart>;
  return { submit: buildSubmitNotification(core), create };
};

describe('createSubmit', () => {
  it('appends one document with the verbatim id, a stamped @timestamp, and the defaulted severity', async () => {
    const { submit, create } = setup();

    await submit(validDraft);

    expect(create).toHaveBeenCalledTimes(1);
    const [{ documents }] = create.mock.calls[0];
    expect(documents).toHaveLength(1);
    const [document] = documents;
    expect(document.notification_id).toBe(validDraft.notification_id);
    expect(document.severity).toBe('info');
    expect(typeof document['@timestamp']).toBe('string');
    // data streams reject a custom _id — the id lives in a field, never as _id
    expect(document).not.toHaveProperty('_id');
  });

  it('rejects an invalid draft with a typed error and writes nothing', async () => {
    const { submit, create } = setup();

    await expect(submit({ ...validDraft, event_timestamp: 'not-a-date' })).rejects.toBeInstanceOf(
      NotificationValidationError
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('throws when the bulk create reports a failure', async () => {
    const { submit, create } = setup();
    create.mockResolvedValueOnce({
      errors: true,
      items: [{ create: { error: { reason: 'mapping conflict' } } }],
    });

    await expect(submit(validDraft)).rejects.toThrow('mapping conflict');
  });
});
