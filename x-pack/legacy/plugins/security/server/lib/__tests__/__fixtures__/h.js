/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stub } from 'sinon';

export function hFixture() {
  const h = {};

  Object.assign(h, {
    authenticated: stub().returns(h),
    continue: 'continue value',
    redirect: stub().returns(h),
    unstate: stub().returns(h),
    takeover: stub().returns(h),
  });

  return h;
}
