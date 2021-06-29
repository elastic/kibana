/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

export async function getIndexNotFoundError(es) {
  try {
    await es.indices.get({
      index: 'SHOULD NOT EXIST',
    });
  } catch (err) {
    expect(err).to.have.property('statusCode', 404); // sanity check
    return err;
  }

  throw new Error('Expected es.indices.get() call to fail');
}

export async function getDocNotFoundError(es) {
  try {
    await es.get({
      index: 'basic_index',
      id: '1234',
    });
  } catch (err) {
    expect(err).to.have.property('statusCode', 404); // sanity check
    return err;
  }

  throw new Error('Expected es.get() call to fail');
}
