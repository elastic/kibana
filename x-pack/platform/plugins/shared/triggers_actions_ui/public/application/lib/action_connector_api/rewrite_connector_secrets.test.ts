/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rewriteConnectorSecrets } from './rewrite_connector_secrets';

describe('rewriteConnectorSecrets', () => {
  it('maps ingest_token to ingestToken', () => {
    expect(rewriteConnectorSecrets({ ingest_token: 'once-token' })).toEqual({
      ingestToken: 'once-token',
    });
  });

  it('leaves other secrets unchanged when ingest_token is absent', () => {
    expect(rewriteConnectorSecrets({ password: 'secret' })).toEqual({ password: 'secret' });
  });
});
