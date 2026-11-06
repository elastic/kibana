/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchConfigFromEnv,
  reviveElasticsearchConfig,
  serializeElasticsearchConfig,
} from './es_config';

describe('Elasticsearch config for a task process', () => {
  it('builds a config from the environment of a remote process', () => {
    const serialized = elasticsearchConfigFromEnv({
      ES_URL: 'http://es1:9200, http://es2:9200',
      ES_USERNAME: 'kibana_system',
      ES_PASSWORD: 'secret',
    });
    expect(serialized).toEqual(
      expect.objectContaining({
        hosts: ['http://es1:9200', 'http://es2:9200'],
        username: 'kibana_system',
        password: 'secret',
      })
    );
  });

  it('sends an API key as a header and no credentials', () => {
    const serialized = elasticsearchConfigFromEnv({
      ES_URL: 'http://es:9200',
      ES_API_KEY: 'k',
    });
    expect(serialized.customHeaders).toEqual({ authorization: 'ApiKey k' });
    expect(serialized.username).toBeUndefined();
  });

  it('requires ES_URL', () => {
    expect(() => elasticsearchConfigFromEnv({})).toThrow('ES_URL is required');
  });

  it('requires credentials instead of defaulting to a superuser', () => {
    expect(() => elasticsearchConfigFromEnv({ ES_URL: 'http://es:9200' })).toThrow(/ES_API_KEY/);
    expect(() =>
      elasticsearchConfigFromEnv({ ES_URL: 'http://es:9200', ES_USERNAME: 'kibana_system' })
    ).toThrow(/ES_PASSWORD/);
  });

  it('survives JSON with its durations and sizes intact', () => {
    const serialized = elasticsearchConfigFromEnv({
      ES_URL: 'http://es:9200',
      ES_API_KEY: 'k',
    });
    const revived = reviveElasticsearchConfig(JSON.parse(JSON.stringify(serialized)));
    expect(revived.hosts).toEqual(['http://es:9200']);
    expect(revived.requestTimeout).toEqual(
      expect.objectContaining({ _milliseconds: expect.any(Number) })
    );
    expect(serializeElasticsearchConfig(revived as never)).toEqual(serialized);
  });
});
