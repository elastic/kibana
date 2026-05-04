/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeExecuteConnectorSubActionArgs } from './normalize_execute_connector_sub_action_args';

describe('normalizeExecuteConnectorSubActionArgs', () => {
  it('passes through canonical shape unchanged', () => {
    const input = {
      connectorId: 'conn-1',
      subAction: 'searchMessages',
      params: { query: 'hello' },
    };
    expect(normalizeExecuteConnectorSubActionArgs(input, {})).toEqual(input);
  });

  it('aliases connector_id and sub_action at root', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs(
        {
          connector_id: 'conn-1',
          sub_action: 'searchMessages',
          params: { query: 'hi' },
        },
        {}
      )
    ).toEqual({
      connectorId: 'conn-1',
      subAction: 'searchMessages',
      params: { query: 'hi' },
    });
  });

  it('hoists connectorId and subAction mistakenly nested in params', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs(
        {
          params: {
            connector_id: 'conn-1',
            sub_action: 'getMessage',
            messageId: 'abc',
          },
        },
        {}
      )
    ).toEqual({
      connectorId: 'conn-1',
      subAction: 'getMessage',
      params: { messageId: 'abc' },
    });
  });

  it('hoists camelCase connectorId and subAction from params', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs(
        {
          params: {
            connectorId: 'conn-1',
            subAction: 'listChannels',
          },
        },
        {}
      )
    ).toEqual({
      connectorId: 'conn-1',
      subAction: 'listChannels',
    });
  });

  it('prefers root connectorId over duplicate connector_id', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs(
        {
          connectorId: 'win',
          connector_id: 'lose',
          subAction: 'searchMessages',
        },
        {}
      )
    ).toEqual({
      connectorId: 'win',
      subAction: 'searchMessages',
    });
  });

  it('removes duplicate connector fields from params when root already has connectorId', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs(
        {
          connectorId: 'root',
          subAction: 'searchMessages',
          params: { connectorId: 'nested', query: 'x' },
        },
        {}
      )
    ).toEqual({
      connectorId: 'root',
      subAction: 'searchMessages',
      params: { query: 'x' },
    });
  });

  it('flattens stray top-level keys into params', () => {
    expect(normalizeExecuteConnectorSubActionArgs({ messageId: '123' }, {})).toEqual({
      params: { messageId: '123' },
    });
  });

  it('merges flattened keys into params and lets top-level overwrite duplicate keys', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs(
        {
          params: { query: 'from-params' },
          query: 'from-root',
        },
        {}
      )
    ).toEqual({
      params: { query: 'from-root' },
    });
  });

  it('preserves _reasoning at root and does not fold it into params', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs(
        {
          _reasoning: 'thinking',
          messageId: 'm1',
        },
        {}
      )
    ).toEqual({
      _reasoning: 'thinking',
      params: { messageId: 'm1' },
    });
  });

  it('fills connectorId from loneConnectorId when missing', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs({ subAction: 'getMessage', params: { id: '1' } }, {
        loneConnectorId: 'only-connector',
      })
    ).toEqual({
      connectorId: 'only-connector',
      subAction: 'getMessage',
      params: { id: '1' },
    });
  });

  it('does not override explicit connectorId with loneConnectorId', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs(
        { connectorId: 'explicit', subAction: 'x', params: {} },
        { loneConnectorId: 'other' }
      )
    ).toEqual({
      connectorId: 'explicit',
      subAction: 'x',
    });
  });

  it('does not set connectorId from empty loneConnectorId string', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs({ subAction: 'x' }, { loneConnectorId: '' })
    ).toEqual({
      subAction: 'x',
    });
  });

  it('returns non-object inputs unchanged', () => {
    expect(normalizeExecuteConnectorSubActionArgs(null, {})).toBe(null);
    expect(normalizeExecuteConnectorSubActionArgs(undefined, {})).toBe(undefined);
    expect(normalizeExecuteConnectorSubActionArgs('raw', {})).toBe('raw');
    expect(normalizeExecuteConnectorSubActionArgs(42, {})).toBe(42);
    expect(normalizeExecuteConnectorSubActionArgs(['a'], {})).toEqual(['a']);
  });

  it('treats non-object params as empty for structural merge', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs(
        {
          connectorId: 'c',
          subAction: 's',
          params: 'invalid',
          extra: 1,
        } as Record<string, unknown>,
        {}
      )
    ).toEqual({
      connectorId: 'c',
      subAction: 's',
      params: { extra: 1 },
    });
  });

  it('omits params when there are no merged keys', () => {
    expect(
      normalizeExecuteConnectorSubActionArgs({ connectorId: 'c', subAction: 's' }, {})
    ).toEqual({
      connectorId: 'c',
      subAction: 's',
    });
  });

  it('does not infer subAction from flattened params only', () => {
    expect(normalizeExecuteConnectorSubActionArgs({ messageId: '123' }, {})).toEqual({
      params: { messageId: '123' },
    });
  });
});
