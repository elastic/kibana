/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { IndexRequest } from '@elastic/elasticsearch/lib/api/types';
import { coreMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { NOTIFICATION_TYPES, SEVERITY } from '../../common';
import type { NotificationDocument } from '../../common/types';
import { buildIdAndTimestamp, NotificationSubmitService } from './submit';
import { NotificationValidationError } from './notification_validation_error';

const modelStatus = NOTIFICATION_TYPES.inference.modelStatus;

/** The document the `create` appended. */
const appendedDocument = (request?: IndexRequest) => request?.document as NotificationDocument;

const content = {
  entity: 'my-endpoint',
  state: 'deprecated',
  title: 'Model deprecated',
  description: 'Your endpoint model is deprecated.',
};

const createDependencies = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const { featureFlags } = coreMock.createStart();
  featureFlags.getBooleanValue$.mockReturnValue(of(enabled));
  return {
    esClient,
    featureFlags,
    index: esClient.index,
    getBooleanValue$: featureFlags.getBooleanValue$,
  };
};

const setup = (opts: { enabled?: boolean } = {}) => {
  const { esClient, featureFlags, index, getBooleanValue$ } = createDependencies(opts);
  return {
    service: new NotificationSubmitService(esClient, featureFlags),
    index,
    getBooleanValue$,
  };
};

describe('NotificationSubmitService', () => {
  it('appends one document with the id built from the type + id parts, a stamped @timestamp, and defaulted severity', async () => {
    const { service, index } = setup();

    const result = await service.submit(modelStatus, content);

    expect(result).toEqual({ status: 'submitted' });
    expect(index).toHaveBeenCalledTimes(1);
    const [request] = index.mock.calls[0];
    expect(request?.index).toBe('.kibana-notifications');
    // A data stream accepts no other op type.
    expect(request?.op_type).toBe('create');
    const document = appendedDocument(request);
    expect(document.notification_id).toBe('inference:modelStatus:my-endpoint:deprecated');
    expect(document.namespace).toBe('inference');
    expect(document.type).toBe('modelStatus');
    expect(document.severity).toBe('info');
    expect(typeof document['@timestamp']).toBe('string');
    // data streams reject a custom _id — the id lives in a field, never as _id
    expect(document).not.toHaveProperty('_id');
  });

  it('stores a producer-provided severity', async () => {
    const { service, index } = setup();

    await service.submit(modelStatus, { ...content, severity: SEVERITY.warning });

    const [request] = index.mock.calls[0];
    expect(appendedDocument(request).severity).toBe('warning');
  });

  it('evaluates the feature flag keyed to the notification namespace/type', async () => {
    const { service, getBooleanValue$ } = setup();

    await service.submit(modelStatus, content);

    expect(getBooleanValue$).toHaveBeenCalledWith(
      'notificationCenter.types.inference.modelStatus',
      false
    );
  });

  it('skips the write and reports skipped_disabled when the type flag is off', async () => {
    const { service, index } = setup({ enabled: false });

    const result = await service.submit(modelStatus, content);

    expect(result).toEqual({ status: 'skipped_disabled' });
    expect(index).not.toHaveBeenCalled();
  });

  it('submits immediately without evaluating a flag when the type declares none', async () => {
    // Isolate a module graph where the type carries no flag, instead of mutating the
    // shared registry-derived flag map (which would leak across tests).
    await jest.isolateModulesAsync(async () => {
      jest.doMock('../../common/feature_flags', () => ({
        NOTIFICATION_TYPE_FLAGS: {},
        NOTIFICATION_TYPE_ENABLED_DEFAULT: false,
      }));
      const { NotificationSubmitService: IsolatedService } = await import('./submit');
      const { esClient, featureFlags, index, getBooleanValue$ } = createDependencies();

      const result = await new IsolatedService(esClient, featureFlags).submit(modelStatus, content);

      expect(getBooleanValue$).not.toHaveBeenCalled();
      expect(index).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'submitted' });
    });
  });

  it('rejects invalid content with a typed error and writes nothing', async () => {
    const { service, index } = setup();

    await expect(service.submit(modelStatus, { ...content, title: '' })).rejects.toBeInstanceOf(
      NotificationValidationError
    );
    expect(index).not.toHaveBeenCalled();
  });

  it('propagates a rejected write', async () => {
    const { service, index } = setup();
    index.mockRejectedValueOnce(new Error('mapping conflict'));

    await expect(service.submit(modelStatus, content)).rejects.toThrow('mapping conflict');
  });
});

describe('buildIdAndTimestamp', () => {
  it('builds a state id and carries no event_timestamp', () => {
    const result = buildIdAndTimestamp('state', 'inference', 'modelStatus', {
      entity: 'my-endpoint',
      state: 'deprecated',
    });

    expect(result.notification_id).toBe('inference:modelStatus:my-endpoint:deprecated');
    expect(result.event_timestamp).toBeUndefined();
  });

  it('builds a timeseries id and sets event_timestamp from epochMs', () => {
    const epochMs = 1750118400000;

    const result = buildIdAndTimestamp('timeseries', 'inference', 'modelStatus', {
      event: 'memoryLimit',
      epochMs,
    });

    expect(result.notification_id).toBe('inference:modelStatus:memoryLimit:1750118400000');
    expect(result.event_timestamp).toBe(new Date(epochMs).toISOString());
  });

  it('rejects a timeseries submission missing event/epochMs', () => {
    expect(() =>
      buildIdAndTimestamp('timeseries', 'inference', 'modelStatus', {
        entity: 'my-endpoint',
        state: 'deprecated',
      })
    ).toThrow(NotificationValidationError);
  });

  it('rejects a state submission missing entity/state', () => {
    expect(() =>
      buildIdAndTimestamp('state', 'inference', 'modelStatus', {
        event: 'memoryLimit',
        epochMs: 1750118400000,
      })
    ).toThrow(NotificationValidationError);
  });
});
