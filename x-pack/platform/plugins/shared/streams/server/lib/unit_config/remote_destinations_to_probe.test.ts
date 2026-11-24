/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { selectRemoteDestinationsToProbe } from './remote_destinations_to_probe';

type Destination = StreamsUnit.Configuration['destinations'][number];

const remoteDestination = ({
  id = 'remote-1',
  type = 'remote_elasticsearch',
  endpoint = 'https://abc.elastic.cloud',
  apiKey = { credential: 'remote-1-api-key' } as unknown,
} = {}): Destination => ({
  id,
  type,
  supported_telemetry: ['logs', 'metrics', 'traces'],
  config: [
    { name: 'endpoint', value: endpoint },
    { name: 'api_key', value: apiKey },
  ],
});

const localDestination: Destination = {
  id: 'es-local',
  type: 'elasticsearch',
  supported_telemetry: ['logs'],
  config: [{ name: 'api_key', value: { credential: 'es-local-api-key' } }],
};

const s3Destination: Destination = {
  id: 's3-archive',
  type: 's3',
  supported_telemetry: ['logs'],
  config: [{ name: 'secret_access_key', value: { credential: 's3-archive-secret' } }],
};

const unitWith = (destinations: Destination[]): StreamsUnit.Configuration => ({
  sources: [],
  destinations,
  pipelines: [],
});

const secrets: StreamsUnit.Secrets = { 'remote-1-api-key': 'key-a' };

describe('selectRemoteDestinationsToProbe', () => {
  it('returns a remote that is not on the stored unit', () => {
    expect(
      selectRemoteDestinationsToProbe({
        unit: unitWith([remoteDestination()]),
        secrets,
        previousUnit: undefined,
        previousSecrets: {},
      })
    ).toEqual([{ id: 'remote-1', endpoint: 'https://abc.elastic.cloud', apiKey: 'key-a' }]);
  });

  it('skips a remote whose endpoint and key are unchanged', () => {
    expect(
      selectRemoteDestinationsToProbe({
        unit: unitWith([remoteDestination()]),
        secrets,
        previousUnit: unitWith([remoteDestination()]),
        previousSecrets: secrets,
      })
    ).toEqual([]);
  });

  it('returns a remote whose endpoint changed, with the stored key', () => {
    expect(
      selectRemoteDestinationsToProbe({
        unit: unitWith([remoteDestination({ endpoint: 'https://def.elastic.cloud' })]),
        secrets,
        previousUnit: unitWith([remoteDestination()]),
        previousSecrets: secrets,
      })
    ).toEqual([{ id: 'remote-1', endpoint: 'https://def.elastic.cloud', apiKey: 'key-a' }]);
  });

  it('returns a remote whose key changed', () => {
    expect(
      selectRemoteDestinationsToProbe({
        unit: unitWith([remoteDestination()]),
        secrets: { 'remote-1-api-key': 'key-b' },
        previousUnit: unitWith([remoteDestination()]),
        previousSecrets: secrets,
      })
    ).toEqual([{ id: 'remote-1', endpoint: 'https://abc.elastic.cloud', apiKey: 'key-b' }]);
  });

  it.each([
    ['an inline string', 'raw-key'],
    ['a reference with extra fields', { credential: 'remote-1-api-key', extra: true }],
  ])('leaves the key undefined for %s', (_label, apiKey) => {
    expect(
      selectRemoteDestinationsToProbe({
        unit: unitWith([remoteDestination({ apiKey })]),
        secrets,
        previousUnit: undefined,
        previousSecrets: {},
      })
    ).toEqual([{ id: 'remote-1', endpoint: 'https://abc.elastic.cloud', apiKey: undefined }]);
  });

  it('ignores local Elasticsearch and S3 destinations', () => {
    expect(
      selectRemoteDestinationsToProbe({
        unit: unitWith([localDestination, s3Destination]),
        secrets: { 'es-local-api-key': 'local-key', 's3-archive-secret': 's3-key' },
        previousUnit: undefined,
        previousSecrets: {},
      })
    ).toEqual([]);
  });

  it.each([
    ['no destinations key', { pipelines: [] }],
    ['a null destination', { destinations: [null] }],
    [
      'a config object instead of a list',
      { destinations: [{ id: 'debug-1', type: 'debug', config: {} }] },
    ],
    [
      'a null config entry',
      { destinations: [{ id: 'remote-1', type: 'remote_elasticsearch', config: [null] }] },
    ],
  ])('returns nothing for a unit with %s', (_label, malformedUnit) => {
    const unit = malformedUnit as unknown as StreamsUnit.Configuration;
    for (const previousUnit of [undefined, unit]) {
      expect(
        selectRemoteDestinationsToProbe({ unit, secrets, previousUnit, previousSecrets: secrets })
      ).toEqual([]);
    }
  });
});
