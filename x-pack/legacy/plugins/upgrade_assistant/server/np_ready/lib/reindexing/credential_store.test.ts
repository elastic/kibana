/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReindexSavedObject } from '../../../../common/types';
import { Credential, credentialStoreFactory } from './credential_store';

describe('credentialStore', () => {
  it('retrieves the same credentials for the same state', () => {
    const creds = { key: '1' } as Credential;
    const reindexOp = {
      id: 'asdf',
      attributes: { indexName: 'test', lastCompletedStep: 1, locked: null },
    } as ReindexSavedObject;

    const credStore = credentialStoreFactory();
    credStore.set(reindexOp, creds);
    expect(credStore.get(reindexOp)).toEqual(creds);
  });

  it('does retrieve credentials if the state is changed', () => {
    const creds = { key: '1' } as Credential;
    const reindexOp = {
      id: 'asdf',
      attributes: { indexName: 'test', lastCompletedStep: 1, locked: null },
    } as ReindexSavedObject;

    const credStore = credentialStoreFactory();
    credStore.set(reindexOp, creds);

    reindexOp.attributes.lastCompletedStep = 0;
    expect(credStore.get(reindexOp)).not.toBeDefined();
  });
});
