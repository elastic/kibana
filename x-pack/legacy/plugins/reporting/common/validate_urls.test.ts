/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateUrls } from './validate_urls';

describe('Validate URLS', () => {
  it(`doesn't throw errors for valid URLs`, () => {
    expect(() => validateUrls(['/im/a/little/teapot'])).not.toThrow();
  });

  it(`throws errors for file protocols`, () => {
    expect(() => validateUrls(['file://me/leet/hacker'])).toThrow();
  });

  it(`throws errors for absolute URLs`, () => {
    expect(() =>
      validateUrls(['http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName'])
    ).toThrow();
  });

  it(`throws errors if any URLs are naughty 👿`, () => {
    expect(() => validateUrls(['/im/ok', '/so/am/i', 'wss://but/ima/steal/your/keys'])).toThrow();
  });
});
