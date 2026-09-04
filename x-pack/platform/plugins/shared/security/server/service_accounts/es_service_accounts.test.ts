/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsServiceAccounts } from './es_service_accounts';

describe('EsServiceAccounts', () => {
  describe('#create', () => {
    it('rejects with a 501 so callers surface a clear "not implemented" response', async () => {
      await expect(new EsServiceAccounts().create()).rejects.toMatchObject({
        message: 'Creating Elasticsearch service accounts is not yet implemented',
        output: { statusCode: 501 },
      });
    });
  });

  describe('#list', () => {
    it('rejects with a 501 so callers surface a clear "not implemented" response', async () => {
      await expect(new EsServiceAccounts().list()).rejects.toMatchObject({
        message: 'Listing Elasticsearch service accounts is not yet implemented',
        output: { statusCode: 501 },
      });
    });
  });

  describe('#get', () => {
    it('rejects with a 501 so callers surface a clear "not implemented" response', async () => {
      await expect(new EsServiceAccounts().get()).rejects.toMatchObject({
        message: 'Getting Elasticsearch service accounts by id is not yet implemented',
        output: { statusCode: 501 },
      });
    });
  });

  // POC ONLY — see CoreServiceAccountsService.exchangeToken for the full rationale.
  describe('#exchangeToken', () => {
    it('rejects with a 501 so callers surface a clear "not implemented" response', async () => {
      await expect(new EsServiceAccounts().exchangeToken()).rejects.toMatchObject({
        message: 'Exchanging Elasticsearch service account tokens is not yet implemented',
        output: { statusCode: 501 },
      });
    });
  });

  describe('#createFakeRequest', () => {
    it('rejects with a 501 so callers surface a clear "not implemented" response', async () => {
      await expect(new EsServiceAccounts().createFakeRequest()).rejects.toMatchObject({
        message: 'Creating requests for Elasticsearch service accounts is not yet implemented',
        output: { statusCode: 501 },
      });
    });
  });

  describe('#reauthenticateFakeRequest', () => {
    it('resolves to null so unrelated fake requests stay on the not-handled path', async () => {
      await expect(new EsServiceAccounts().reauthenticateFakeRequest()).resolves.toBeNull();
    });
  });

  describe('#releaseFakeRequest', () => {
    it('is a no-op since this backend never mints requests', () => {
      expect(() => new EsServiceAccounts().releaseFakeRequest()).not.toThrow();
    });
  });
});
