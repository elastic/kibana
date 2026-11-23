/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { IUiSettingsClient } from '@kbn/core/public';

/**
 * Creates a mock uiSettings service for Storybook stories
 * @param dateFormat defaults to 'MMM D, YYYY @ HH:mm:ss.SSS'
 * @param timezone defaults to 'UTC'
 * @returns mocked IUiSettingsClient
 */
export const mockUiSettingsService = (
  dateFormat: string = 'MMM D, YYYY @ HH:mm:ss.SSS',
  timezone: string = 'UTC'
) =>
  ({
    get: (key: string) => {
      const settings = {
        dateFormat,
        'dateFormat:tz': timezone,
      };
      // @ts-expect-error
      return settings[key];
    },
    get$: () => {
      // Return an observable-like object for reactive settings
      return {
        subscribe: (callback: (value: any) => void) => {
          // Immediately call with the current value
          const settings = {
            dateFormat,
            'dateFormat:tz': timezone,
          };
          callback(settings);
          // Return unsubscribe function
          return { unsubscribe: () => {} };
        },
      };
    },
  }) as unknown as IUiSettingsClient;
