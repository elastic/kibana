/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const mockUseKibana = {
  services: {
    uiSettings: {
      get: jest.fn().mockImplementation((key) => {
        const get = (k: 'dateFormat' | 'timepicker:quickRanges') => {
          const x = {
            dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
            'timepicker:quickRanges': [
              {
                from: 'now/d',
                to: 'now/d',
                display: 'Today',
              },
              {
                from: 'now/w',
                to: 'now/w',
                display: 'This week',
              },
              {
                from: 'now-15m',
                to: 'now',
                display: 'Last 15 minutes',
              },
              {
                from: 'now-30m',
                to: 'now',
                display: 'Last 30 minutes',
              },
              {
                from: 'now-1h',
                to: 'now',
                display: 'Last 1 hour',
              },
              {
                from: 'now-24h',
                to: 'now',
                display: 'Last 24 hours',
              },
              {
                from: 'now-7d',
                to: 'now',
                display: 'Last 7 days',
              },
            ],
          };
          return x[k];
        };
        return get(key);
      }),
    },
  },
};

export const generateDataStreams = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    name: `.ds-${i}`,
    storageSizeBytes: 1024 ** 2 * (22 / 7),
  }));
};
