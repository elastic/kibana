/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

export const verifyErrorResponse = (
  r: any,
  expectedCode: number,
  message?: string,
  shouldHaveAttrs?: boolean
) => {
  expect(r.statusCode).to.be(expectedCode);
  if (message) {
    expect(r.message).to.be(message);
  }
  if (shouldHaveAttrs) {
    expect(r).to.have.property('attributes');
    expect(r.attributes).to.have.property('root_cause');
  } else {
    expect(r).not.to.have.property('attributes');
  }
};
