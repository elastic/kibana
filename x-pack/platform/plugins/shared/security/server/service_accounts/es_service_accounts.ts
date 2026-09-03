/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest } from '@kbn/core/server';
import type { ServiceAccount } from '@kbn/core-security-server';

import type { ServiceAccountsBackend } from './types';

/**
 * Elasticsearch-backed service accounts, used when UIAM is not available.
 *
 * Not implemented yet — see https://github.com/elastic/kibana/issues/284464. The
 * backend exists so that backend selection is a real, testable code path rather
 * than something to be retrofitted later.
 */
export class EsServiceAccounts implements ServiceAccountsBackend {
  async create(): Promise<ServiceAccount> {
    throw Boom.notImplemented('Creating Elasticsearch service accounts is not yet implemented');
  }

  async list(): Promise<never> {
    throw Boom.notImplemented('Listing Elasticsearch service accounts is not yet implemented');
  }

  async get(): Promise<never> {
    throw Boom.notImplemented(
      'Getting Elasticsearch service accounts by id is not yet implemented'
    );
  }

  // See https://github.com/elastic/kibana/issues/284466.
  async createFakeRequest(): Promise<KibanaRequest> {
    throw Boom.notImplemented(
      'Creating requests for Elasticsearch service accounts is not yet implemented'
    );
  }

  // POC ONLY — see CoreServiceAccountsService.exchangeToken for the full rationale.
  async exchangeToken(): Promise<never> {
    throw Boom.notImplemented(
      'Exchanging Elasticsearch service account tokens is not yet implemented'
    );
  }

  // This backend never mints service-account-bound requests, so there is nothing to refresh;
  // `null` (rather than an error) keeps the ES-client unauthorized-error handler on its
  // not-handled path for unrelated fake requests.
  async reauthenticateFakeRequest(): Promise<{ authorization: string } | null> {
    return null;
  }

  // Nothing is ever registered by this backend, so there is nothing to release.
  releaseFakeRequest(): void {}
}
