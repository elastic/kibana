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
  getVisibleDestinationFormErrors,
} from './destination_form';
import { EMPTY_ELASTICSEARCH_DESTINATION_FORM, EMPTY_S3_DESTINATION_FORM } from './types';

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
      destinationName: 'Application logs',
      description: '',
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
      destinationName: 'Application logs',
      description: '',
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
      destinationName: 'Templated logs',
      description: '',
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
      destinationName: 'Metrics as logs',
      description: '',
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
      destinationName: 'Application',
      description: '',
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
      destinationName: 'Application logs',
      description: '',
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
      destinationName: 'Application',
      description: '',
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

  it('allows custom auto write patterns for the selected signals', () => {
    const formData = {
      storageKind: 'local_elasticsearch' as const,
      s3: { ...EMPTY_S3_DESTINATION_FORM },
      destinationName: 'Billing',
      description: '',
      elasticsearch: {
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        useCustomWritePatterns: true,
        customSignals: ['logs' as const, 'metrics' as const],
        logsIndex: 'logs-billing-*',
        metricsIndex: 'metrics-billing-*',
      },
    };

    expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({
      destinationName: undefined,
    });
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(true);
  });

  it('requires a signal and a pattern for every selected signal in custom auto mode', () => {
    const formData = {
      storageKind: 'local_elasticsearch' as const,
      s3: { ...EMPTY_S3_DESTINATION_FORM },
      destinationName: 'Billing',
      description: '',
      elasticsearch: { ...EMPTY_ELASTICSEARCH_DESTINATION_FORM, useCustomWritePatterns: true },
    };

    expect(getDestinationCreationFormErrors({ formData, unitDefinition }).customSignals).toBe(
      'required'
    );
    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(false);

    const withSignal = {
      ...formData,
      elasticsearch: { ...formData.elasticsearch, customSignals: ['traces' as const] },
    };
    expect(getDestinationCreationFormErrors({ formData: withSignal, unitDefinition })).toEqual({
      destinationName: undefined,
      tracesIndex: 'required',
    });
    expect(canSubmitDestinationForm({ formData: withSignal, unitDefinition })).toBe(false);
  });

  it('ignores patterns of unselected signals in custom auto mode', () => {
    const formData = {
      storageKind: 'local_elasticsearch' as const,
      s3: { ...EMPTY_S3_DESTINATION_FORM },
      destinationName: 'Billing',
      description: '',
      elasticsearch: {
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        useCustomWritePatterns: true,
        customSignals: ['logs' as const],
        logsIndex: 'logs-billing-*',
        metricsIndex: 'not-a-pattern',
      },
    };

    expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(true);
  });

  it.each(['billing-*', 'logs-billing*', 'metrics-billing-*'])(
    'rejects auto logs write target %s that does not match logs-*-*',
    (logsIndex) => {
      const formData = {
        storageKind: 'local_elasticsearch' as const,
        s3: { ...EMPTY_S3_DESTINATION_FORM },
        destinationName: 'Billing',
        description: '',
        elasticsearch: {
          ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
          useCustomWritePatterns: true,
          customSignals: ['logs' as const],
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
    description: '',
    elasticsearch: { ...EMPTY_ELASTICSEARCH_DESTINATION_FORM },
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

describe('getVisibleDestinationFormErrors', () => {
  const errors = {
    destinationName: 'required',
    staticIndexes: 'required',
    logsIndex: 'uppercase',
    region: 'required',
  } as const;

  it('only shows the errors of touched fields', () => {
    expect(
      getVisibleDestinationFormErrors({
        errors,
        touchedFields: { elasticsearch: { logsIndex: true } },
        isSubmitted: false,
      })
    ).toEqual({ staticIndexes: 'required', logsIndex: 'uppercase' });
  });

  it('shows every error once the form was submitted', () => {
    expect(
      getVisibleDestinationFormErrors({ errors, touchedFields: {}, isSubmitted: true })
    ).toEqual(errors);
  });
});
