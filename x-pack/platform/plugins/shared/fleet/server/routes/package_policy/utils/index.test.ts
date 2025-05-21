/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alignInputsAndStreams } from '.';

describe('alignInputsAndStreams', () => {
  it('should turn input.enabled to false if all its streams are disabled', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: true,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs-2',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual([
      {
        type: 'input-logs',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs-2',
            },
          },
        ],
      },
    ]);
  });

  it('should turn input.enabled to false if its only stream is disabled', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: true,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual([
      {
        type: 'input-logs',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
        ],
      },
    ]);
  });

  it('should not do anything if an input is not enabled and has some of its streams enabled', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: false,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs-2',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual(inputs);
  });

  it('should not do anything if an input is enabled and has at least a stream enabled', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual(inputs);
  });

  it('should not do anything if an input is enabled and all its streams enabled', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual(inputs);
  });

  it('should not not do anything if an input is not enabled and all its streams are disabled too', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'test.some_logs',
            },
          },
        ],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual(inputs);
  });

  it('should not do anything if an input is enabled but has no streams', async () => {
    const inputs = [
      {
        type: 'input-logs',
        enabled: true,
        streams: [],
      },
    ];
    expect(alignInputsAndStreams(inputs)).toEqual(inputs);
  });
});
