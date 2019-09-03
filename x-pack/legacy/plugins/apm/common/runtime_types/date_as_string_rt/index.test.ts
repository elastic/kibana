/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { dateAsStringRt } from './index';

describe('dateAsStringRt', () => {
  it('validates whether a string is a valid date', () => {
    expect(dateAsStringRt.decode(1566299881499).isLeft()).toBe(true);

    expect(dateAsStringRt.decode('2019-08-20T11:18:31.407Z').isRight()).toBe(
      true
    );
  });

  it('returns the string it was given', () => {
    const either = dateAsStringRt.decode('2019-08-20T11:18:31.407Z');

    expect(either.value).toBe('2019-08-20T11:18:31.407Z');
  });
});
