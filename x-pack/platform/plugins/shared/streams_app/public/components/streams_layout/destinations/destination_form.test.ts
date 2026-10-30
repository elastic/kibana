/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import {
  canSubmitDestinationForm,
  getDestinationCreationFormErrors,
  validateRemoteEndpoint,
} from './destination_form';
import { validateRemoteIndex, validateStaticSignalIndex } from './destination_models';
import type { RemoteElasticsearchDestinationFormData } from './types';
import {
  EMPTY_ELASTICSEARCH_DESTINATION_FORM,
  EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM,
  EMPTY_S3_DESTINATION_FORM,
  REMOTE_ELASTICSEARCH_TYPE,
} from './types';

const unitDefinition: StreamsUnit.GetResponse = {
  unit: {
    sources: [],
    destinations: [],
    pipelines: [],
  },
  ui_metadata: {},
};

describe('destination form', () => {
  it('allows auto mode without an index', () => {
    const formData = {
      storageKind: 'local_elasticsearch' as const,
      s3: { ...EMPTY_S3_DESTINATION_FORM },
      remoteElasticsearch: { ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM },
      destinationName: 'Application logs',
      elasticsearch: { ...EMPTY_ELASTICSEARCH_DESTINATION_FORM },
    };

    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({
      destinationName: undefined,
    });
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(true);
  });

  it('requires at least one static index when auto is off', () => {
    const formData = {
      storageKind: 'local_elasticsearch' as const,
      s3: { ...EMPTY_S3_DESTINATION_FORM },
      remoteElasticsearch: { ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM },
      destinationName: 'Application logs',
      elasticsearch: { ...EMPTY_ELASTICSEARCH_DESTINATION_FORM, auto: false },
    };

    expect(getDestinationCreationFormErrors({ formData, unitDefinition }).staticIndexes).toBe(
      'required'
    );
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(false);
  });

  it('rejects templated static indexes', () => {
    const formData = {
      storageKind: 'local_elasticsearch' as const,
      s3: { ...EMPTY_S3_DESTINATION_FORM },
      remoteElasticsearch: { ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM },
      destinationName: 'Templated logs',
      elasticsearch: {
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        auto: false,
        logsIndex: 'logs-{{data_stream.dataset}}-{{data_stream.namespace}}',
      },
    };

    expect(getDestinationCreationFormErrors({ formData, unitDefinition }).logsIndex).toBe(
      'template'
    );
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(false);
  });

  it('rejects a logs index that does not match logs-*', () => {
    const formData = {
      storageKind: 'local_elasticsearch' as const,
      s3: { ...EMPTY_S3_DESTINATION_FORM },
      remoteElasticsearch: { ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM },
      destinationName: 'Metrics as logs',
      elasticsearch: {
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        auto: false,
        logsIndex: 'metrics-app-default',
      },
    };

    expect(getDestinationCreationFormErrors({ formData, unitDefinition }).logsIndex).toBe(
      'signalPattern'
    );
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(false);
  });

  it('allows All-composed static indexes', () => {
    const formData = {
      storageKind: 'local_elasticsearch' as const,
      s3: { ...EMPTY_S3_DESTINATION_FORM },
      remoteElasticsearch: { ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM },
      destinationName: 'Application',
      elasticsearch: {
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        auto: false,
        logsIndex: 'logs-app-default',
        metricsIndex: 'metrics-app-default',
        tracesIndex: 'traces-app-default',
      },
    };

    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({
      destinationName: undefined,
    });
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(true);
  });

  it('allows a single valid static logs index', () => {
    const formData = {
      storageKind: 'local_elasticsearch' as const,
      s3: { ...EMPTY_S3_DESTINATION_FORM },
      remoteElasticsearch: { ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM },
      destinationName: 'Application logs',
      elasticsearch: {
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        auto: false,
        logsIndex: 'logs-app-default',
      },
    };

    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({
      destinationName: undefined,
    });
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(true);
  });

  it('rejects a name that already exists for a signal being created', () => {
    const existingUnit: StreamsUnit.GetResponse = {
      unit: {
        sources: [],
        destinations: [
          {
            id: 'app-logs',
            name: 'Application',
            type: 'elasticsearch',
            supported_telemetry: ['logs'],
            config: [{ name: 'index', value: 'logs-app-default' }],
          },
        ],
        pipelines: [],
      },
      ui_metadata: {},
    };
    const formData = {
      storageKind: 'local_elasticsearch' as const,
      s3: { ...EMPTY_S3_DESTINATION_FORM },
      remoteElasticsearch: { ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM },
      destinationName: 'Application',
      elasticsearch: {
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        auto: false,
        logsIndex: 'logs-app-default',
        metricsIndex: 'metrics-app-default',
      },
    };

    expect(
      getDestinationCreationFormErrors({ formData, unitDefinition: existingUnit }).destinationName
    ).toBe('duplicate');
    expect(
      getDestinationCreationFormErrors({
        formData: {
          ...formData,
          elasticsearch: { ...formData.elasticsearch, logsIndex: '' },
        },
        unitDefinition: existingUnit,
      }).destinationName
    ).toBeUndefined();
  });

  it('allows auto write targets that keep a signal prefix', () => {
    const formData = {
      storageKind: 'local_elasticsearch' as const,
      s3: { ...EMPTY_S3_DESTINATION_FORM },
      remoteElasticsearch: { ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM },
      destinationName: 'Billing',
      elasticsearch: {
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        logsIndex: 'logs-billing-*',
        metricsIndex: 'metrics-billing-*',
        tracesIndex: 'traces-billing-*',
      },
    };

    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({
      destinationName: undefined,
    });
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(true);
  });

  it.each(['billing-*', 'logs-billing*', 'metrics-billing-*'])(
    'rejects auto logs write target %s that does not match logs-*-*',
    (logsIndex) => {
      const formData = {
        storageKind: 'local_elasticsearch' as const,
        s3: { ...EMPTY_S3_DESTINATION_FORM },
        remoteElasticsearch: { ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM },
        destinationName: 'Billing',
        elasticsearch: {
          ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
          logsIndex,
        },
      };

      expect(getDestinationCreationFormErrors({ formData, unitDefinition }).logsIndex).toBe(
        'signalPattern'
      );
      expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(false);
    }
  );
});

describe('S3', () => {
  const s3Form = (overrides: Partial<typeof EMPTY_S3_DESTINATION_FORM>) => ({
    storageKind: 'external_storage' as const,
    destinationName: 'S3 archive',
    elasticsearch: { ...EMPTY_ELASTICSEARCH_DESTINATION_FORM },
    remoteElasticsearch: { ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM },
    s3: {
      ...EMPTY_S3_DESTINATION_FORM,
      region: 'eu-west-1',
      bucket: 'demo-bucket',
      accessKeyId: 'AKIA',
      secretAccessKey: 'shh',
      ...overrides,
    },
  });

  it('requires region, bucket, access key id and secret access key after trim', () => {
    const formData = s3Form({ region: '  ', bucket: '', accessKeyId: ' ', secretAccessKey: '' });
    const errors = getDestinationCreationFormErrors({ formData, unitDefinition });
    expect(errors).toMatchObject({
      region: 'required',
      bucket: 'required',
      accessKeyId: 'required',
      secretAccessKey: 'required',
    });
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(false);
  });

  it('rejects a bucket outside 3 to 63 characters', () => {
    expect(
      getDestinationCreationFormErrors({ formData: s3Form({ bucket: 'ab' }), unitDefinition })
        .bucket
    ).toBe('invalid');
    expect(
      getDestinationCreationFormErrors({
        formData: s3Form({ bucket: 'a'.repeat(64) }),
        unitDefinition,
      }).bucket
    ).toBe('invalid');
  });

  it('leaves prefix optional and can submit', () => {
    const formData = s3Form({ prefix: '' });
    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({
      destinationName: undefined,
    });
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(true);
  });

  it('rejects a name whose credential name would exceed 256 characters', () => {
    const formData = { ...s3Form({}), destinationName: 'a'.repeat(240) };
    expect(getDestinationCreationFormErrors({ formData, unitDefinition }).destinationName).toBe(
      'tooLong'
    );
  });

  it('rejects a name whose credential name is already referenced in the unit', () => {
    const unit: StreamsUnit.GetResponse = {
      ...unitDefinition,
      unit: {
        ...unitDefinition.unit,
        sources: [
          {
            id: 'src',
            type: 'otlp',
            supported_telemetry: ['logs'],
            config: [{ name: 'token', value: { credential: 's3-archive-access-key-id' } }],
          },
        ],
      },
    };
    expect(
      getDestinationCreationFormErrors({ formData: s3Form({}), unitDefinition: unit })
        .destinationName
    ).toBe('credentialConflict');
  });

  it('reports a duplicate S3 name against any signal', () => {
    const unit: StreamsUnit.GetResponse = {
      ...unitDefinition,
      unit: {
        ...unitDefinition.unit,
        destinations: [
          {
            id: 's3-archive',
            name: 'S3 archive',
            type: 'elasticsearch',
            supported_telemetry: ['traces'],
          },
        ],
      },
    };
    expect(
      getDestinationCreationFormErrors({ formData: s3Form({}), unitDefinition: unit })
        .destinationName
    ).toBe('duplicate');
  });
});

describe('validateRemoteEndpoint', () => {
  it.each([
    'https://es.example.com',
    'https://es.example.com:9243',
    'https://proxy.example.com/es/',
    'https://10.0.0.1:443',
    'https://proxy.example.com/es%20prod/',
  ])('accepts %s', (endpoint) => {
    expect(validateRemoteEndpoint(endpoint)).toBeUndefined();
  });

  it.each([
    'http://es.example.com',
    'https:example.com',
    'https:/example.com',
    'https://user:pw@es.example.com',
    'https://es.example.com?x=1',
    'https://es.example.com#a',
    'https://es.exa\nmple.com',
    'es.example.com',
    '\thttps://es.example.com',
    'https://es.example.com\\proxy',
    'https://es.example.com/a b',
    '\u00a0https://es.example.com',
    'https://es.exa\u200bmple.com',
    'https://ex\u034fample.com',
    'https://es.example.com:99999',
    'https://es.example.com/%',
    'https://es.example.com/%GG',
    'https://es%41.example.com',
  ])('rejects %j', (endpoint) => {
    expect(validateRemoteEndpoint(endpoint)).toBe('invalid');
  });

  it.each(['', '  '])('is required when blank (%j)', (endpoint) => {
    expect(validateRemoteEndpoint(endpoint)).toBe('required');
  });

  it('trims plain surrounding spaces', () => {
    expect(validateRemoteEndpoint('  https://es.example.com  ')).toBeUndefined();
  });

  it('accepts up to 2048 characters', () => {
    const endpoint = `https://${'a'.repeat(2048 - 'https://'.length - '.com'.length)}.com`;
    expect(endpoint).toHaveLength(2048);
    expect(validateRemoteEndpoint(endpoint)).toBeUndefined();
    expect(validateRemoteEndpoint(`${endpoint}/`)).toBe('invalid');
    expect(validateRemoteEndpoint(`https://${'a'.repeat(2048)}.com`)).toBe('invalid');
  });
});

describe('validateRemoteIndex', () => {
  it('accepts a name local rejects', () => {
    expect(validateStaticSignalIndex('logs', 'my-index')).toBe('signalPattern');
    expect(validateRemoteIndex('my-index')).toBeUndefined();
  });

  it('ignores blank and trims plain surrounding spaces', () => {
    expect(validateRemoteIndex('')).toBeUndefined();
    expect(validateRemoteIndex('  my-index  ')).toBeUndefined();
  });

  it('accepts up to 255 UTF-8 bytes', () => {
    expect(validateRemoteIndex('a'.repeat(255))).toBeUndefined();
    expect(validateRemoteIndex('a'.repeat(256))).toBe('invalidName');
    expect(validateRemoteIndex('\u00e9'.repeat(128))).toBe('invalidName');
  });

  it.each([
    ['{{x}}', 'template'],
    ['logs-${foo}-default', 'template'],
    ['a b', 'invalidCharacter'],
    ['a\u0001b', 'invalidCharacter'],
    ['a\u00a0b', 'invalidCharacter'],
    ['a*b', 'invalidCharacter'],
    ['MyIndex', 'uppercase'],
    ['.ds-my-index', 'invalidName'],
  ])('rejects %j as %s', (index, error) => {
    expect(validateRemoteIndex(index)).toBe(error);
  });
});

describe('remote Elasticsearch', () => {
  const remoteForm = (
    overrides: Partial<RemoteElasticsearchDestinationFormData> = {},
    destinationName = 'Central'
  ) => ({
    storageKind: 'remote_elasticsearch' as const,
    destinationName,
    elasticsearch: { ...EMPTY_ELASTICSEARCH_DESTINATION_FORM },
    s3: { ...EMPTY_S3_DESTINATION_FORM },
    remoteElasticsearch: {
      ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM,
      endpoint: 'https://es.example.com:443',
      apiKey: 'k1',
      ...overrides,
    },
  });

  it('accepts auto with an endpoint and an API key', () => {
    const formData = remoteForm();
    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({
      destinationName: undefined,
    });
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(true);
  });

  it('requires the endpoint and the API key after trim', () => {
    const formData = remoteForm({ endpoint: '  ', apiKey: ' ' });
    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toMatchObject({
      endpoint: 'required',
      apiKey: 'required',
    });
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(false);
  });

  it('does not validate the local or S3 slices', () => {
    const formData = {
      ...remoteForm(),
      elasticsearch: { ...EMPTY_ELASTICSEARCH_DESTINATION_FORM, auto: false },
    };
    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({
      destinationName: undefined,
    });
  });

  it('requires at least one index in fixed', () => {
    const formData = remoteForm({ auto: false });
    expect(getDestinationCreationFormErrors({ formData, unitDefinition }).staticIndexes).toBe(
      'required'
    );
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(false);
  });

  it('accepts full index names without a signal prefix in fixed', () => {
    const formData = remoteForm({ auto: false, logsIndex: 'my-index', tracesIndex: 'my-traces' });
    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({
      destinationName: undefined,
    });
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(true);
  });

  it('validates each fixed index with the remote rules', () => {
    const formData = remoteForm({
      auto: false,
      logsIndex: 'logs-${foo}-default',
      metricsIndex: 'a\tb',
      tracesIndex: 'MyIndex',
    });
    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toMatchObject({
      logsIndex: 'template',
      metricsIndex: 'invalidCharacter',
      tracesIndex: 'uppercase',
    });
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(false);
  });

  it('ignores index values left over in auto, which are not saved', () => {
    const formData = remoteForm({ auto: true, logsIndex: 'MyIndex' });
    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({
      destinationName: undefined,
    });
  });

  it('rejects a name whose API key credential name would exceed 256 characters', () => {
    expect(
      getDestinationCreationFormErrors({
        formData: remoteForm({}, 'a'.repeat(249)),
        unitDefinition,
      }).destinationName
    ).toBe('tooLong');
    expect(
      getDestinationCreationFormErrors({
        formData: remoteForm({}, 'a'.repeat(248)),
        unitDefinition,
      }).destinationName
    ).toBeUndefined();
  });

  it('rejects a name whose API key credential name is already referenced in the unit', () => {
    const unit: StreamsUnit.GetResponse = {
      ...unitDefinition,
      unit: {
        ...unitDefinition.unit,
        sources: [
          {
            id: 'src',
            type: 'otlp',
            supported_telemetry: ['logs'],
            config: [{ name: 'token', value: { credential: 'central-api-key' } }],
          },
        ],
      },
    };
    expect(
      getDestinationCreationFormErrors({ formData: remoteForm(), unitDefinition: unit })
        .destinationName
    ).toBe('credentialConflict');
  });

  describe('duplicate name', () => {
    const unit: StreamsUnit.GetResponse = {
      ...unitDefinition,
      unit: {
        ...unitDefinition.unit,
        destinations: [
          {
            id: 'central',
            name: 'Central',
            type: REMOTE_ELASTICSEARCH_TYPE,
            supported_telemetry: ['traces'],
          },
        ],
      },
    };

    it('checks every signal in auto, even with index values left over', () => {
      expect(
        getDestinationCreationFormErrors({ formData: remoteForm(), unitDefinition: unit })
          .destinationName
      ).toBe('duplicate');
      expect(
        getDestinationCreationFormErrors({
          formData: remoteForm({ logsIndex: 'my-index' }),
          unitDefinition: unit,
        }).destinationName
      ).toBe('duplicate');
    });

    it('checks only the filled signals in fixed', () => {
      expect(
        getDestinationCreationFormErrors({
          formData: remoteForm({ auto: false, logsIndex: 'my-index' }),
          unitDefinition: unit,
        }).destinationName
      ).toBeUndefined();
      expect(
        getDestinationCreationFormErrors({
          formData: remoteForm({ auto: false, tracesIndex: 'my-index' }),
          unitDefinition: unit,
        }).destinationName
      ).toBe('duplicate');
    });
  });
});
