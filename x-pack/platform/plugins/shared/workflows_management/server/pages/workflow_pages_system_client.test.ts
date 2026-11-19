/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { WorkflowYaml } from '@kbn/workflows';
import {
  createFakeStore,
  createPageAuditMock,
  getStoredPage,
  noPageDefinition,
  pageDefinition,
  pageRef as ref,
  WORKFLOW_CREATED_AT,
} from './fake_page_store.mock';
import { getWorkflowPageSavedObjectId } from './page_saved_object';
import { computePageSecretHash } from './page_secret';
import { WorkflowPagesSystemClientImpl } from './workflow_pages_system_client';
import { WorkflowPagesUnavailableError } from './workflow_pages_unavailable_error';

const setup = ({ canEncrypt = true } = {}) => {
  const store = createFakeStore();
  const savedObjectsClient = store.createClient();
  const logger = loggingSystemMock.createLogger();
  const audit = createPageAuditMock();
  const client = new WorkflowPagesSystemClientImpl({
    logger,
    canEncrypt,
    savedObjectsClient,
    audit,
  });
  const sync = (
    definition: WorkflowYaml | null,
    overrides: Partial<typeof ref> & { workflowCreatedAt?: string; request?: KibanaRequest } = {}
  ) =>
    client.syncWorkflowPages({
      workflowId: overrides.workflowId ?? ref.workflowId,
      workflowCreatedAt: overrides.workflowCreatedAt ?? WORKFLOW_CREATED_AT,
      spaceId: overrides.spaceId ?? ref.spaceId,
      definition,
      valid: true,
      request: overrides.request,
    });
  const storedPage = (pageRef = ref) => getStoredPage(store, pageRef);
  /** Puts a page online with a known secret, the way the request client would. */
  const putOnline = (secret: string) => {
    const page = storedPage();
    if (!page) throw new Error('no page');
    page.attributes = {
      ...page.attributes,
      secret,
      secretHash: computePageSecretHash(ref, secret),
      access: { level: 'secret_link' },
      enabled: true,
    };
  };
  return { client, store, savedObjectsClient, logger, audit, sync, storedPage, putOnline };
};

describe('WorkflowPagesSystemClient', () => {
  describe('syncWorkflowPages', () => {
    it('creates an offline page without an access level on the first save with a page trigger', async () => {
      const { storedPage, sync } = setup();

      await sync(pageDefinition());

      expect(storedPage()?.attributes).toEqual(
        expect.objectContaining({
          workflowId: 'workflow-1',
          pageId: 'default',
          access: null,
          enabled: true,
        })
      );
    });

    it('keeps the secret when the workflow is saved again', async () => {
      const { storedPage, sync } = setup();
      await sync(pageDefinition());
      const { secret } = storedPage()?.attributes ?? {};

      await sync(pageDefinition());

      expect(storedPage()?.attributes.secret).toBe(secret);
    });

    it('retires the page when the trigger is removed, and makes a new secret when it is back', async () => {
      const { storedPage, sync } = setup();
      await sync(pageDefinition());
      const { secret } = storedPage()?.attributes ?? {};

      await sync(noPageDefinition);
      expect(storedPage()).toBeUndefined();

      await sync(pageDefinition());
      expect(storedPage()?.attributes.secret).toEqual(expect.any(String));
      expect(storedPage()?.attributes.secret).not.toBe(secret);
    });

    it('replaces the page when the trigger id changes', async () => {
      const { storedPage, sync } = setup();
      await sync(pageDefinition());

      await sync(pageDefinition('intake'));

      expect(storedPage()).toBeUndefined();
      expect(storedPage({ ...ref, pageId: 'intake' })).toBeDefined();
    });

    it('keeps the page and its secret across an invalid save without the trigger', async () => {
      const { client, storedPage, sync } = setup();
      await sync(pageDefinition());
      const secretHash = storedPage()?.attributes.secretHash;

      await client.syncWorkflowPages({
        workflowId: ref.workflowId,
        workflowCreatedAt: WORKFLOW_CREATED_AT,
        spaceId: ref.spaceId,
        definition: noPageDefinition,
        valid: false,
      });
      expect(storedPage()?.attributes.secretHash).toBe(secretHash);
      await sync(pageDefinition());

      expect(storedPage()?.attributes.secretHash).toBe(secretHash);
    });

    it('moves the page with a workflow that moved to another space', async () => {
      const { store, storedPage, sync } = setup();
      await sync(pageDefinition());
      const oldHash = storedPage()?.attributes.secretHash;

      await sync(pageDefinition(), { spaceId: 'team' });

      expect(storedPage()).toBeUndefined();
      const moved = store.docs.get(store.key(getWorkflowPageSavedObjectId(ref), 'team'));
      expect(moved).toBeDefined();
      expect(moved?.attributes.secretHash).not.toBe(oldHash);
    });

    it('never gives a global workflow a page', async () => {
      const { savedObjectsClient, sync } = setup();
      await sync(pageDefinition(), { spaceId: '*' });
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('throws instead of creating a page without an encryption key', async () => {
      const { savedObjectsClient, sync } = setup({ canEncrypt: false });
      await expect(sync(pageDefinition())).rejects.toBeInstanceOf(WorkflowPagesUnavailableError);
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('keeps the existing page when a concurrent save created it first', async () => {
      const { savedObjectsClient, storedPage, sync } = setup();
      await sync(pageDefinition());
      const { secret } = storedPage()?.attributes ?? {};
      savedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 1,
      });

      await sync(pageDefinition());

      expect(storedPage()?.attributes.secret).toBe(secret);
    });
  });

  describe('stale pages', () => {
    it('gives a recreated workflow with a reused id a new page, not the old secret', async () => {
      const { storedPage, sync } = setup();
      await sync(pageDefinition());
      const { secret } = storedPage()?.attributes ?? {};

      // The old workflow was force-deleted, its retire failed, and the id was reused.
      await sync(pageDefinition(), { workflowCreatedAt: '2026-02-01T00:00:00.000Z' });

      expect(storedPage()?.attributes).toEqual(
        expect.objectContaining({
          workflowCreatedAt: '2026-02-01T00:00:00.000Z',
          access: null,
        })
      );
      expect(storedPage()?.attributes.secret).not.toBe(secret);
    });

    it('retires a stale page even when the new workflow has no page trigger', async () => {
      const { storedPage, sync } = setup();
      await sync(pageDefinition());

      await sync(noPageDefinition, { workflowCreatedAt: '2026-02-01T00:00:00.000Z' });

      expect(storedPage()).toBeUndefined();
    });
  });

  describe('audit', () => {
    const request = httpServerMock.createKibanaRequest();

    it('audits a created page with the request that caused it', async () => {
      const { audit, sync } = setup();
      await sync(pageDefinition(), { request });
      expect(audit.logPageCreated).toHaveBeenCalledWith(request, ref);
    });

    it.each([
      ['trigger_removed', () => noPageDefinition, {}],
      ['stale_workflow', () => pageDefinition(), { workflowCreatedAt: '2026-02-01T00:00:00.000Z' }],
    ] as const)('audits a retire with %s', async (reason, definition, overrides) => {
      const { audit, sync } = setup();
      await sync(pageDefinition());

      await sync(definition(), { ...overrides, request });

      expect(audit.logPageRetired).toHaveBeenCalledWith(request, { ...ref, reason });
    });

    it('audits a failed retire as a failure, and throws', async () => {
      const { audit, client, savedObjectsClient, sync } = setup();
      await sync(pageDefinition());
      jest.mocked(savedObjectsClient.bulkDelete).mockResolvedValueOnce({
        statuses: [
          {
            id: getWorkflowPageSavedObjectId(ref),
            type: 'workflow-page',
            success: false,
            error: { error: 'Internal Server Error', message: 'boom', statusCode: 500 },
          },
        ],
      });

      await expect(
        client.retireWorkflowPages({
          workflowIds: [ref.workflowId],
          spaceId: ref.spaceId,
          reason: 'workflow_deleted',
          request,
        })
      ).rejects.toThrow('Failed to retire workflow pages');
      expect(audit.logPageRetired).toHaveBeenCalledWith(request, {
        ...ref,
        reason: 'workflow_deleted',
        error: new Error('boom'),
      });
    });

    it('audits a failed create as a failure', async () => {
      const { audit, savedObjectsClient, sync } = setup();
      jest.mocked(savedObjectsClient.create).mockRejectedValueOnce(new Error('boom'));

      await expect(sync(pageDefinition(), { request })).rejects.toThrow('boom');
      expect(audit.logPageCreated).toHaveBeenCalledWith(request, {
        ...ref,
        error: new Error('boom'),
      });
    });
  });

  describe('unpublishWorkflowPages', () => {
    it('clears the access level, keeps the secret, and audits it', async () => {
      const { audit, client, putOnline, storedPage, sync } = setup();
      await sync(pageDefinition());
      putOnline('the-secret');
      const request = httpServerMock.createKibanaRequest();

      await client.unpublishWorkflowPages({ ...ref, request });

      expect(storedPage()?.attributes).toEqual(
        expect.objectContaining({ access: null, enabled: true, secret: 'the-secret' })
      );
      expect(audit.logPageAccessChanged).toHaveBeenCalledWith(request, { ...ref, access: null });
    });

    it('leaves a page without an access level alone', async () => {
      const { audit, client, savedObjectsClient, sync } = setup();
      await sync(pageDefinition());

      await client.unpublishWorkflowPages(ref);

      expect(savedObjectsClient.update).not.toHaveBeenCalled();
      expect(audit.logPageAccessChanged).not.toHaveBeenCalled();
    });
  });

  describe('retireRemovedPages', () => {
    it('retires only the pages whose trigger the definition dropped', async () => {
      const { client, sync, store } = setup();
      await sync({
        ...pageDefinition('kept'),
        triggers: [...pageDefinition('kept').triggers, ...pageDefinition('dropped').triggers],
      });

      await client.retireRemovedPages({
        workflowId: ref.workflowId,
        spaceId: ref.spaceId,
        definition: pageDefinition('kept'),
      });

      expect(getStoredPage(store, { ...ref, pageId: 'kept' })).toBeDefined();
      expect(getStoredPage(store, { ...ref, pageId: 'dropped' })).toBeUndefined();
    });

    it('throws when a delete fails, so the save fails before its write', async () => {
      const { client, savedObjectsClient, sync, storedPage } = setup();
      await sync(pageDefinition());
      jest.mocked(savedObjectsClient.bulkDelete).mockResolvedValueOnce({
        statuses: [
          {
            id: getWorkflowPageSavedObjectId(ref),
            type: 'workflow-page',
            success: false,
            error: { error: 'Internal Server Error', message: 'boom', statusCode: 500 },
          },
        ],
      });

      await expect(
        client.retireRemovedPages({
          workflowId: ref.workflowId,
          spaceId: ref.spaceId,
          definition: noPageDefinition,
        })
      ).rejects.toThrow('Failed to retire workflow pages');
      expect(storedPage()).toBeDefined();
    });
  });

  describe('retireWorkflowPages', () => {
    it('searches 1,000 workflows per request', async () => {
      const { client, savedObjectsClient } = setup();
      const workflowIds = Array.from({ length: 2_001 }, (_, index) => `workflow-${index}`);

      await client.retireWorkflowPages({
        workflowIds,
        spaceId: 'default',
        reason: 'workflow_deleted',
      });

      expect(savedObjectsClient.find).toHaveBeenCalledTimes(3);
    });

    it('retires every page of the given workflows', async () => {
      const { client, storedPage, sync } = setup();
      await sync(pageDefinition());
      await sync(pageDefinition(), { workflowId: 'workflow-2' });

      await client.retireWorkflowPages({
        workflowIds: ['workflow-1', 'workflow-2'],
        spaceId: 'default',
        reason: 'workflow_deleted',
      });

      expect(storedPage()).toBeUndefined();
      expect(storedPage({ ...ref, workflowId: 'workflow-2' })).toBeUndefined();
    });

    it('does nothing for an empty list', async () => {
      const { client, savedObjectsClient } = setup();
      await client.retireWorkflowPages({
        workflowIds: [],
        spaceId: 'default',
        reason: 'workflow_deleted',
      });
      expect(savedObjectsClient.find).not.toHaveBeenCalled();
    });
  });

  describe('verifyPageSecret', () => {
    const onlinePage = async () => {
      const ctx = setup();
      await ctx.sync(pageDefinition());
      ctx.putOnline('the-secret');
      return ctx;
    };

    it('returns the workflow created_at of an online page for its secret, without a decrypt', async () => {
      const { client, store } = await onlinePage();
      await expect(client.verifyPageSecret(ref, 'the-secret')).resolves.toEqual({
        workflowCreatedAt: WORKFLOW_CREATED_AT,
      });
      expect(store.encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
    });

    it('rejects a wrong secret with secret_mismatch', async () => {
      const { client } = await onlinePage();
      await expect(client.verifyPageSecret(ref, 'wrong')).resolves.toEqual({
        reason: 'secret_mismatch',
      });
    });

    it.each([
      ['another workflow', { ...ref, workflowId: 'workflow-2' }],
      ['another space', { ...ref, spaceId: 'other' }],
    ])('rejects a page of %s with page_not_found', async (_, otherRef) => {
      const { client } = await onlinePage();
      await expect(client.verifyPageSecret(otherRef, 'the-secret')).resolves.toEqual({
        reason: 'page_not_found',
      });
    });

    it.each([
      ['without an access level', { access: null }],
      ['that is disabled', { enabled: false }],
    ])('rejects a page %s with page_offline', async (_, attributes) => {
      const { client, storedPage } = await onlinePage();
      const page = storedPage();
      if (page) page.attributes = { ...page.attributes, ...attributes };
      await expect(client.verifyPageSecret(ref, 'the-secret')).resolves.toEqual({
        reason: 'page_offline',
      });
      await expect(client.verifyPageSecret(ref, 'wrong')).resolves.toEqual({
        reason: 'secret_mismatch',
      });
    });

    it('rejects every secret without an encryption key, checking the secret first', async () => {
      const { savedObjectsClient, logger, audit } = await onlinePage();
      const client = new WorkflowPagesSystemClientImpl({
        logger,
        canEncrypt: false,
        savedObjectsClient,
        audit,
      });
      await expect(client.verifyPageSecret(ref, 'the-secret')).resolves.toEqual({
        reason: 'page_offline',
      });
      await expect(client.verifyPageSecret(ref, 'wrong')).resolves.toEqual({
        reason: 'secret_mismatch',
      });
    });
  });
});
