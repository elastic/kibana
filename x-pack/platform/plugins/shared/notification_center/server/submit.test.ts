/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';
import { NOTIFICATION_TYPE_FLAGS } from '../common/feature_flags';
import type { NotificationInput } from '../common/types';
import { buildSubmitNotification, NotificationValidationError } from './submit';
import type { NotificationCenterPluginStart, NotificationCenterStartDependencies } from './types';

const validDraft: NotificationInput = {
  notification_id: 'inference:my-endpoint:deprecated',
  event_timestamp: '2026-07-09T12:00:00.000Z',
  namespace: 'inference',
  type: 'modelStatus',
  title: 'Model deprecated',
  description: 'Your endpoint model is deprecated.',
};

const setup = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const create = jest.fn().mockResolvedValue({ errors: false, items: [{ create: {} }] });
  const dataStreams = dataStreamServiceMock.createStartContract();
  dataStreams.initializeClient.mockResolvedValue({ create } as never);
  const getBooleanValue = jest.fn().mockResolvedValue(enabled);
  const core = {
    getStartServices: jest
      .fn()
      .mockResolvedValue([{ dataStreams, featureFlags: { getBooleanValue } }]),
  } as unknown as CoreSetup<NotificationCenterStartDependencies, NotificationCenterPluginStart>;
  return { submit: buildSubmitNotification(core), create, getBooleanValue };
};

describe('createSubmit', () => {
  it('appends one document with the verbatim id, a stamped @timestamp, and the defaulted severity', async () => {
    const { submit, create } = setup();

    const result = await submit(validDraft);

    expect(result).toEqual({ status: 'submitted' });
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

  it('evaluates the feature flag keyed to the notification namespace/type', async () => {
    const { submit, getBooleanValue } = setup();

    await submit(validDraft);

    expect(getBooleanValue).toHaveBeenCalledWith(
      'notificationCenter.types.inference.modelStatus',
      false
    );
  });

  it('skips the write and reports skipped_disabled when the type flag is off', async () => {
    const { submit, create } = setup({ enabled: false });

    const result = await submit(validDraft);

    expect(result).toEqual({ status: 'skipped_disabled' });
    expect(create).not.toHaveBeenCalled();
  });

  it('submits immediately without evaluating a flag when the type declares none', async () => {
    const ref = 'inference.modelStatus' as const;
    const configured = NOTIFICATION_TYPE_FLAGS[ref];
    delete NOTIFICATION_TYPE_FLAGS[ref];
    try {
      const { submit, create, getBooleanValue } = setup();

      const result = await submit(validDraft);

      expect(getBooleanValue).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'submitted' });
    } finally {
      NOTIFICATION_TYPE_FLAGS[ref] = configured;
    }
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
