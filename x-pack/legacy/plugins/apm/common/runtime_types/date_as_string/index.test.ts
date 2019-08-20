/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { dateAsString } from './index';

describe('dateAsString', () => {
  it('validates whether a string is a valid date', () => {
    expect(dateAsString.decode(1566299881499).isLeft()).toBe(true);

    expect(dateAsString.decode('2019-08-20T11:18:31.407Z').isRight()).toBe(
      true
    );
  });

  it('returns the string it was given', () => {
    const either = dateAsString.decode('2019-08-20T11:18:31.407Z');

    expect(either.value).toBe('2019-08-20T11:18:31.407Z');
  });
});
