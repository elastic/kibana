/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { noop } from 'lodash';
import { deprecations as deprecationsModule } from './deprecations';

describe('monitoring plugin deprecations', function () {
  let transformDeprecations;
  const deprecate = vi.fn(() => vi.fn());
  const rename = vi.fn(() => vi.fn());
  const renameFromRoot = vi.fn(() => vi.fn());
  const unused = vi.fn(() => vi.fn());
  const fromPath = 'monitoring';

  beforeAll(function () {
    const deprecations = deprecationsModule({ deprecate, rename, renameFromRoot, unused });
    transformDeprecations = (settings, fromPath, addDeprecation = noop) => {
      deprecations.forEach((deprecation) => deprecation(settings, fromPath, addDeprecation));
    };
  });

  describe('cluster_alerts.email_notifications.email_address', function () {
    it(`shouldn't log when email notifications are disabled`, function () {
      const settings = {
        cluster_alerts: {
          email_notifications: {
            enabled: false,
          },
        },
      };

      const addDeprecation = vi.fn();
      transformDeprecations(settings, fromPath, addDeprecation);
      expect(addDeprecation).not.toHaveBeenCalled();
    });

    it(`shouldn't log when email_address is specified`, function () {
      const settings = {
        cluster_alerts: {
          email_notifications: {
            enabled: true,
            email_address: 'foo@bar.com',
          },
        },
      };

      const addDeprecation = vi.fn();
      transformDeprecations(settings, fromPath, addDeprecation);
      expect(addDeprecation).not.toHaveBeenCalled();
    });

    it(`should log when email_address is missing, but alerts/notifications are both enabled`, function () {
      const settings = {
        cluster_alerts: {
          email_notifications: {
            enabled: true,
          },
        },
      };

      const addDeprecation = vi.fn();
      transformDeprecations(settings, fromPath, addDeprecation);
      expect(addDeprecation).toHaveBeenCalled();
    });
  });

  describe('xpack_api_polling_frequency_millis', () => {
    it('should call rename for this renamed config key', () => {
      const settings = { xpack_api_polling_frequency_millis: 30000 };
      const addDeprecation = vi.fn();
      transformDeprecations(settings, fromPath, addDeprecation);
      expect(rename).toHaveBeenCalled();
    });
  });
});
