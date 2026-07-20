/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';
import { NOTIFICATION_TYPES, SEVERITY } from '../common';
import { buildForType, NotificationValidationError } from './submit';
import type { NotificationCenterPluginStart, NotificationCenterStartDependencies } from './types';

const modelStatus = NOTIFICATION_TYPES.inference.modelStatus;

const content = {
  entity: 'my-endpoint',
  state: 'deprecated',
  title: 'Model deprecated',
  description: 'Your endpoint model is deprecated.',
};

const createCoreMock = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const create = jest.fn().mockResolvedValue({ errors: false, items: [{ create: {} }] });
  const dataStreams = dataStreamServiceMock.createStartContract();
  dataStreams.initializeClient.mockResolvedValue({ create } as never);
  const getBooleanValue = jest.fn().mockResolvedValue(enabled);
  const core = {
    getStartServices: jest
      .fn()
      .mockResolvedValue([{ dataStreams, featureFlags: { getBooleanValue } }]),
  } as unknown as CoreSetup<NotificationCenterStartDependencies, NotificationCenterPluginStart>;
  return { core, create, getBooleanValue };
};

const setup = (opts: { enabled?: boolean } = {}) => {
  const { core, create, getBooleanValue } = createCoreMock(opts);
  return { forType: buildForType(core), create, getBooleanValue };
};

describe('buildForType', () => {
  it('appends one document with the id built from the type + id parts, a stamped @timestamp, and defaulted severity', async () => {
    const { forType, create } = setup();

    const result = await forType(modelStatus).submit(content);

    expect(result).toEqual({ status: 'submitted' });
    expect(create).toHaveBeenCalledTimes(1);
    const [{ documents }] = create.mock.calls[0];
    expect(documents).toHaveLength(1);
    const [document] = documents;
    expect(document.notification_id).toBe('inference:modelStatus:my-endpoint:deprecated');
    expect(document.namespace).toBe('inference');
    expect(document.type).toBe('modelStatus');
    expect(document.severity).toBe('info');
    expect(typeof document['@timestamp']).toBe('string');
    // data streams reject a custom _id — the id lives in a field, never as _id
    expect(document).not.toHaveProperty('_id');
  });

  it('stores a producer-provided severity', async () => {
    const { forType, create } = setup();

    await forType(modelStatus).submit({ ...content, severity: SEVERITY.warning });

    const [{ documents }] = create.mock.calls[0];
    expect(documents[0].severity).toBe('warning');
  });

  it('evaluates the feature flag keyed to the notification namespace/type', async () => {
    const { forType, getBooleanValue } = setup();

    await forType(modelStatus).submit(content);

    expect(getBooleanValue).toHaveBeenCalledWith(
      'notificationCenter.types.inference.modelStatus',
      false
    );
  });

  it('skips the write and reports skipped_disabled when the type flag is off', async () => {
    const { forType, create } = setup({ enabled: false });

    const result = await forType(modelStatus).submit(content);

    expect(result).toEqual({ status: 'skipped_disabled' });
    expect(create).not.toHaveBeenCalled();
  });

  it('submits immediately without evaluating a flag when the type declares none', async () => {
    // Isolate a module graph where the type carries no flag, instead of mutating the
    // shared registry-derived flag map (which would leak across tests).
    await jest.isolateModulesAsync(async () => {
      jest.doMock('../common/feature_flags', () => ({
        NOTIFICATION_TYPE_FLAGS: {},
        NOTIFICATION_TYPE_ENABLED_DEFAULT: false,
      }));
      const { buildForType: buildIsolated } = await import('./submit');
      const { core, create, getBooleanValue } = createCoreMock();

      const result = await buildIsolated(core)(modelStatus).submit(content);

      expect(getBooleanValue).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'submitted' });
    });
  });

  it('rejects invalid content with a typed error and writes nothing', async () => {
    const { forType, create } = setup();

    await expect(forType(modelStatus).submit({ ...content, title: '' })).rejects.toBeInstanceOf(
      NotificationValidationError
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('throws when the bulk create reports a failure', async () => {
    const { forType, create } = setup();
    create.mockResolvedValueOnce({
      errors: true,
      items: [{ create: { error: { reason: 'mapping conflict' } } }],
    });

    await expect(forType(modelStatus).submit(content)).rejects.toThrow('mapping conflict');
  });
});
