/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { canSubmitDestinationForm, getDestinationCreationFormErrors } from './destination_form';
import { EMPTY_ELASTICSEARCH_DESTINATION_FORM } from './types';

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
