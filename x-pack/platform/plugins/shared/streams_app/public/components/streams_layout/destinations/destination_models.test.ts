/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { getDestinationNameValidationError } from './destination_helpers';
import {
  createS3UnitDestination,
  createUnitDestination,
  getConfiguredDestinations,
  withUnitDestinations,
} from './destination_models';

const storedUnit: StreamsUnit.GetResponse = {
  unit: {
    sources: [{ id: 'otlp-input', type: 'otlp', supported_telemetry: ['logs'] }],
    destinations: [
      {
        id: 'logs-prod',
        name: 'Logs prod',
        type: 'elasticsearch',
        supported_telemetry: ['logs'],
        config: [{ name: 'index', value: 'logs-prod' }],
      },
      { id: 'debug-out', type: 'debug', supported_telemetry: ['logs'] },
    ],
    pipelines: [],
  },
  ui_metadata: {},
};

describe('destination models', () => {
  it('maps local Elasticsearch destinations and ignores other destination types', () => {
    expect(getConfiguredDestinations(storedUnit)).toEqual([
      {
        id: 'logs-prod',
        name: 'Logs prod',
        type: 'elasticsearch',
        index: 'logs-prod',
        indexPatterns: ['logs-prod'],
      },
    ]);
  });

  it('adds an Elasticsearch destination without dropping other unit components', () => {
    const next = withUnitDestinations(storedUnit, [
      ...storedUnit.unit.destinations,
      createUnitDestination({
        id: 'logs-nginx-default',
        name: 'logs-nginx-default',
        index: 'logs-nginx-default',
        indexPatterns: [],
      }),
    ]);

    expect(next.unit.sources).toEqual(storedUnit.unit.sources);
    expect(next.unit.destinations).toEqual([
      storedUnit.unit.destinations[0],
      storedUnit.unit.destinations[1],
      {
        id: 'logs-nginx-default',
        name: 'logs-nginx-default',
        type: 'elasticsearch',
        supported_telemetry: ['logs', 'metrics', 'traces'],
        config: [{ name: 'index', value: 'logs-nginx-default' }],
      },
    ]);
  });

  it('rejects a destination name that matches an existing destination', () => {
    expect(
      getDestinationNameValidationError({
        destinationName: ' logs prod ',
        unitDefinition: storedUnit,
      })
    ).toBe('duplicate');
    expect(
      getDestinationNameValidationError({
        destinationName: 'logs-nginx-default',
        unitDefinition: storedUnit,
      })
    ).toBeUndefined();
  });

  it('writes index_patterns when the index is a template', () => {
    expect(
      createUnitDestination({
        id: 'es-logs',
        name: 'Logs',
        index: 'logs-{{data_stream.dataset}}-{{data_stream.namespace}}',
        indexPatterns: ['logs-*-*'],
      }).config
    ).toEqual([
      {
        name: 'index',
        value: 'logs-{{data_stream.dataset}}-{{data_stream.namespace}}',
      },
      { name: 'index_patterns', value: ['logs-*-*'] },
    ]);
  });

  describe('S3', () => {
    const s3Destination = createS3UnitDestination({
      id: 's3-archive',
      name: 'S3 archive',
      region: 'eu-west-1',
      bucket: 'demo-bucket',
      accessKey: 'AKIAEXAMPLEKEYID',
      secret: 'example-secret-access-key',
    });

    it('writes the bucket, region, access_key and secret config entries', () => {
      expect(s3Destination).toEqual({
        id: 's3-archive',
        name: 'S3 archive',
        type: 's3',
        supported_telemetry: ['logs', 'metrics', 'traces'],
        config: [
          { name: 'bucket', value: 'demo-bucket' },
          { name: 'region', value: 'eu-west-1' },
          { name: 'access_key', value: 'AKIAEXAMPLEKEYID' },
          { name: 'secret', value: 'example-secret-access-key' },
        ],
      });
    });

    it('maps S3 destinations without their credentials', () => {
      const [, s3] = getConfiguredDestinations(
        withUnitDestinations(storedUnit, [...storedUnit.unit.destinations, s3Destination])
      );

      expect(s3).toEqual({
        id: 's3-archive',
        name: 'S3 archive',
        type: 's3',
        bucket: 'demo-bucket',
        region: 'eu-west-1',
      });
      expect(Object.keys(s3)).not.toContain('secret');
      expect(Object.keys(s3)).not.toContain('access_key');
      expect(Object.keys(s3)).not.toContain('accessKey');
      expect(JSON.stringify(s3)).not.toContain('example-secret-access-key');
      expect(JSON.stringify(s3)).not.toContain('AKIAEXAMPLEKEYID');
    });
  });
});
