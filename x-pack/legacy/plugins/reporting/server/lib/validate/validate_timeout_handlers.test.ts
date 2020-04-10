/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateTimeoutHandlers } from './validate_timeout_handlers';
import { ReportingConfig } from '../../types';

const defaultConfig = {
  'queue.timeout': 120000,
  'capture.timeouts.openUrl': 30000,
  'capture.timeouts.waitForElements': 30000,
  'capture.timeouts.renderComplete': 30000,
  'capture.timeouts.timeBeforeTimeoutBreachHandler': 10000,
};

const configGenerator = (overrides: Record<string, number> = {}) => {
  const config = {
    ...defaultConfig,
    ...overrides,
  };

  return {
    // @ts-ignore types being lost here...
    get: (...paths: string[]): number | undefined => config[paths.join('.')],
  };
};

describe('Reporting: Validate timeout handlers', () => {
  it('does nothing if timeouts are OK', () => {
    const config = configGenerator() as unknown;
    expect(validateTimeoutHandlers(config as ReportingConfig));
  });

  it('throws errors if overall timeout is lesser than the sub timeouts', () => {
    const throws = () =>
      validateTimeoutHandlers(configGenerator({ 'queue.timeout': 5000 }) as ReportingConfig);

    expect(throws).toThrowError(
      'Timeout of "30000ms" for "xpack.reporting.capture.timeouts.openUrl" is greater than the overall timeout of "5000"ms. Please set "xpack.reporting.queue.timeout" to a higher level, or decrease "xpack.reporting.capture.timeouts.openUrl" below 5000'
    );
  });

  [
    'capture.timeouts.openUrl',
    'capture.timeouts.waitForElements',
    'capture.timeouts.renderComplete',
    'capture.timeouts.timeBeforeTimeoutBreachHandler',
  ].forEach(configPath => {
    it(`throws errors if a ${configPath} is greater than the overall timeout`, () => {
      const throws = () =>
        validateTimeoutHandlers(configGenerator({ [configPath]: 150000 }) as ReportingConfig);

      expect(throws).toThrowError(
        `Timeout of "150000ms" for "xpack.reporting.${configPath}" is greater than the overall timeout of "120000"ms. Please set "xpack.reporting.queue.timeout" to a higher level, or decrease "xpack.reporting.${configPath}" below 120000`
      );
    });
  });
});
