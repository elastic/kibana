/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { redactSecrets, sanitizeDataSource } from './data_source';
import { withImpactMapEventId } from './events';

describe('redactSecrets', () => {
  it('hides credentials in headers, JSON and curl flags', () => {
    expect(redactSecrets('Authorization: Bearer abcdefgh12345678')).not.toContain('abcdefgh');
    expect(redactSecrets('{"api_key": "s3cr3t-value", "size": 1}')).toBe(
      '{"api_key": "[hidden]", "size": 1}'
    );
    expect(redactSecrets('curl -u elastic:hunter2 https://es/_search')).not.toContain('hunter2');
    expect(redactSecrets('x-api-key: abc123')).toBe('x-api-key: [hidden]');
  });

  it('leaves ordinary text alone', () => {
    const query = 'FROM metrics-* | WHERE k8s.deployment.name == "shipping" | STATS count()';
    expect(redactSecrets(query)).toBe(query);
    expect(redactSecrets('{"token_count": 3}')).toBe('{"token_count": 3}');
  });
});

describe('sanitizeDataSource', () => {
  it('keeps the source, query and call, and upper-cases the method', () => {
    expect(
      sanitizeDataSource({
        name: 'Elasticsearch',
        query: { language: 'ES|QL', text: 'FROM logs | LIMIT 1' },
        api_call: { method: 'post', type: '_query', endpoint: '/_query', payload: '{"a":1}' },
      })
    ).toEqual({
      name: 'Elasticsearch',
      query: { language: 'ES|QL', text: 'FROM logs | LIMIT 1' },
      api_call: { method: 'POST', type: '_query', endpoint: '/_query', payload: '{"a":1}' },
    });
  });

  it('is applied to every event that is written', () => {
    const event = withImpactMapEventId({
      kind: 'failure',
      title: 'x',
      at: '2026-11-07T10:00:00Z',
      entity_id: 'a',
      data_source: {
        name: 'Elasticsearch',
        api_call: { method: 'GET', endpoint: '/_search', payload: '{"password": "pw"}' },
      },
    });
    expect(event.data_source?.api_call?.payload).toBe('{"password": "[hidden]"}');
  });
});

describe('clock times in an event chart', () => {
  it('are dated on the day of the event when the event is written', () => {
    const event = withImpactMapEventId({
      kind: 'failure',
      title: 'x',
      at: '2026-11-07T16:54:00Z',
      entity_id: 'a',
      evidence: {
        chart: {
          type: 'line',
          title: 't',
          x_axis: { type: 'time' },
          y_axis: {},
          series: [
            {
              name: 's',
              points: [
                { x: '16:30', y: 1 },
                { x: '2026-11-07T16:40:00Z', y: 2 },
              ],
            },
          ],
          annotations: [{ x: '16:54Z', label: 'a' }],
        },
      },
    });
    expect(event.evidence?.chart?.series[0].points.map(({ x }) => x)).toEqual([
      '2026-11-07T16:30:00Z',
      '2026-11-07T16:40:00Z',
    ]);
    expect(event.evidence?.chart?.annotations?.[0].x).toBe('2026-11-07T16:54:00Z');
  });
});
