/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  type SavedObjectDiff,
  scanForDiff,
  waitForDiffEvent,
} from '../../../scout_security_audit/api/helpers/audit_log';

// `index-pattern` is a standard, non-hidden type creatable through the public
// saved objects HTTP API, and its attributes are plain strings — convenient for
// asserting exact diff values.
const TYPE = 'index-pattern';

// Not listed in `typesToInclude` on the test server (see config_sets/security_audit_so_diff/shared.ts).
// A non-hidden, publicly-creatable type whose create schema accepts a bare `{ title }`.
const NON_INCLUDED_TYPE = 'visualization';

// The public saved objects API is internal-origin gated and state-changing.
const KBN_HEADERS = { 'kbn-xsrf': 'x', 'x-elastic-internal-origin': 'kibana' };

const opAt = (diff: SavedObjectDiff, path: string) => diff.ops.find((op) => op.path === path);
const noOpPaths = (diff: SavedObjectDiff) => diff.noOps.map((noOp) => noOp.path);

apiTest.describe(
  'Audit log — saved object diffs (ECS file appender)',
  // Local-only: tests read from the ECS file appender at AUDIT_LOG_PATH, which is only
  // accessible when the test runner is co-located with Kibana (not on Cloud deployments).
  { tag: [...tags.stateful.classic.filter((t) => t.startsWith('@local')), ...tags.serverless.security.complete.filter((t) => t.startsWith('@local'))] },
  () => {
    // Objects registered here are torn down after each test so re-runs don't
    // accumulate state on shared or long-lived stacks. Tests that delete their
    // own objects (the delete/bulk-delete cases) don't need to register them.
    const savedObjectsToCleanUp: Array<{ type: string; id: string }> = [];
    const connectorsToCleanUp: string[] = [];

    apiTest.afterEach(async ({ apiClient, samlAuth }) => {
      if (!savedObjectsToCleanUp.length && !connectorsToCleanUp.length) {
        return;
      }
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const headers = { ...cookieHeader, ...KBN_HEADERS };
      if (savedObjectsToCleanUp.length) {
        await apiClient.post('api/saved_objects/_bulk_delete', {
          headers,
          body: savedObjectsToCleanUp.splice(0),
          responseType: 'json',
        });
      }
      // `action` is a hidden type, not deletable through the saved objects API;
      // the connector API removes it (and its ESO payload) properly.
      for (const connectorId of connectorsToCleanUp.splice(0)) {
        await apiClient.delete(`api/actions/connector/${connectorId}`, {
          headers,
          responseType: 'json',
        });
      }
    });

    apiTest('create emits add ops with an empty "before"', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const id = `so-diff-create-${Date.now()}`;

      const res = await apiClient.post(`api/saved_objects/${TYPE}/${id}`, {
        headers: { ...cookieHeader, ...KBN_HEADERS },
        body: { attributes: { title: 'created' } },
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);
      savedObjectsToCleanUp.push({ type: TYPE, id });

      const diff = await waitForDiffEvent('saved_object_create', id);
      expect(diff.format).toBe('json_patch_extended');
      // Exact shape proves it's an `add` (value only, no oldValue).
      expect(opAt(diff, '/title')).toStrictEqual({ op: 'add', path: '/title', value: 'created' });
    });

    apiTest(
      'update emits a replace op with oldValue and noOps for unchanged fields',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...cookieHeader, ...KBN_HEADERS };
        const id = `so-diff-update-${Date.now()}`;

        await apiClient.post(`api/saved_objects/${TYPE}/${id}`, {
          headers,
          body: { attributes: { title: 'old', timeFieldName: 'ts' } },
          responseType: 'json',
        });
        savedObjectsToCleanUp.push({ type: TYPE, id });

        // Partial update: only `title` changes; `timeFieldName` is untouched.
        const res = await apiClient.put(`api/saved_objects/${TYPE}/${id}`, {
          headers,
          body: { attributes: { title: 'new' } },
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(200);

        const diff = await waitForDiffEvent('saved_object_update', id);
        expect(opAt(diff, '/title')).toMatchObject({
          op: 'replace',
          value: 'new',
          oldValue: 'old',
        });
        expect(noOpPaths(diff)).toContain('/timeFieldName');
      }
    );

    apiTest('delete emits remove ops with an empty "after"', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const headers = { ...cookieHeader, ...KBN_HEADERS };
      const id = `so-diff-delete-${Date.now()}`;

      await apiClient.post(`api/saved_objects/${TYPE}/${id}`, {
        headers,
        body: { attributes: { title: 'to-delete' } },
        responseType: 'json',
      });

      const res = await apiClient.delete(`api/saved_objects/${TYPE}/${id}`, {
        headers,
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);

      const diff = await waitForDiffEvent('saved_object_delete', id);
      // Exact shape proves it's a `remove` (oldValue only, no value).
      expect(opAt(diff, '/title')).toStrictEqual({
        op: 'remove',
        path: '/title',
        oldValue: 'to-delete',
      });
    });

    apiTest(
      'bulk create emits a per-object diff for each object',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const idA = `so-diff-bulkcreate-a-${Date.now()}`;
        const idB = `so-diff-bulkcreate-b-${Date.now()}`;

        const res = await apiClient.post('api/saved_objects/_bulk_create', {
          headers: { ...cookieHeader, ...KBN_HEADERS },
          body: [
            { type: TYPE, id: idA, attributes: { title: 'bulk-a' } },
            { type: TYPE, id: idB, attributes: { title: 'bulk-b' } },
          ],
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(200);

        const diffA = await waitForDiffEvent('saved_object_create', idA);
        const diffB = await waitForDiffEvent('saved_object_create', idB);
        expect(opAt(diffA, '/title')).toMatchObject({ op: 'add', value: 'bulk-a' });
        expect(opAt(diffB, '/title')).toMatchObject({ op: 'add', value: 'bulk-b' });
      }
    );

    apiTest(
      'bulk delete emits a per-object diff for each object',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...cookieHeader, ...KBN_HEADERS };
        const idA = `so-diff-bulkdelete-a-${Date.now()}`;
        const idB = `so-diff-bulkdelete-b-${Date.now()}`;

        await apiClient.post('api/saved_objects/_bulk_create', {
          headers,
          body: [
            { type: TYPE, id: idA, attributes: { title: 'del-a' } },
            { type: TYPE, id: idB, attributes: { title: 'del-b' } },
          ],
          responseType: 'json',
        });

        const res = await apiClient.post('api/saved_objects/_bulk_delete', {
          headers,
          body: [
            { type: TYPE, id: idA },
            { type: TYPE, id: idB },
          ],
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(200);

        const diffA = await waitForDiffEvent('saved_object_delete', idA);
        const diffB = await waitForDiffEvent('saved_object_delete', idB);
        expect(opAt(diffA, '/title')).toMatchObject({ op: 'remove', oldValue: 'del-a' });
        expect(opAt(diffB, '/title')).toMatchObject({ op: 'remove', oldValue: 'del-b' });
      }
    );

    apiTest(
      'replaces values above the configured fieldSizeLimit with the sentinel',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const id = `so-diff-bigfield-${Date.now()}`;
        // The server sets fieldSizeLimit=10kb (below the 48kb default). `underLimit` (~5kb)
        // stays verbatim; `overLimit` (~20kb) is above 10kb but below the 48kb default, so
        // its truncation to the sentinel only happens if the configured value is honored.
        const underLimit = 'u'.repeat(5_000);
        const overLimit = 'o'.repeat(20_000);

        const res = await apiClient.post(`api/saved_objects/${TYPE}/${id}`, {
          headers: { ...cookieHeader, ...KBN_HEADERS },
          body: { attributes: { title: 'small', timeFieldName: underLimit, fields: overLimit } },
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(200);
        savedObjectsToCleanUp.push({ type: TYPE, id });

        const diff = await waitForDiffEvent('saved_object_create', id);
        expect(opAt(diff, '/title')).toMatchObject({ op: 'add', value: 'small' });
        // Under the configured limit -> kept verbatim.
        expect(opAt(diff, '/timeFieldName')).toMatchObject({ op: 'add', value: underLimit });
        // Over the configured 10kb (but under the 48kb default) -> sentinel proves the config.
        expect(opAt(diff, '/fields')).toMatchObject({
          op: 'add',
          value: 'Value above fieldSizeLimit',
        });
      }
    );

    apiTest(
      'does not emit a diff for saved object types outside typesToInclude',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...cookieHeader, ...KBN_HEADERS };
        const omittedId = `so-diff-omitted-${Date.now()}`;
        const controlId = `so-diff-control-${Date.now()}`;

        // `visualization` is not in `typesToInclude`. Create it first, then a control
        // `index-pattern` (allow-listed) to give a definite "the pipeline has flushed" signal.
        const omittedRes = await apiClient.post(
          `api/saved_objects/${NON_INCLUDED_TYPE}/${omittedId}`,
          { headers, body: { attributes: { title: 'omitted' } }, responseType: 'json' }
        );
        expect(omittedRes).toHaveStatusCode(200);
        savedObjectsToCleanUp.push({ type: NON_INCLUDED_TYPE, id: omittedId });

        const controlRes = await apiClient.post(`api/saved_objects/${TYPE}/${controlId}`, {
          headers,
          body: { attributes: { title: 'control' } },
          responseType: 'json',
        });
        expect(controlRes).toHaveStatusCode(200);
        savedObjectsToCleanUp.push({ type: TYPE, id: controlId });

        // Once the control's diff event is present, the earlier non-allow-listed create has
        // been processed too — so if it were going to emit a diff, it already would have.
        await waitForDiffEvent('saved_object_create', controlId);

        // The non-allow-listed type still gets its normal audit event, but no diff-bearing one.
        expect(scanForDiff('saved_object_create', omittedId)).toBeUndefined();
      }
    );

    apiTest('redacts encrypted (ESO) attributes in the diff', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const id = `so-diff-eso-${Date.now()}`;
      const boundary = 'scoutSavedObjectDiffEsoBoundary';

      // `action` (connector) is a hidden, ESO-encrypted type — not creatable via the public
      // create API — but it IS importable, and the import path runs through the SO security +
      // encryption extensions, so `secrets` is stored as ciphertext and a diff is emitted.
      // (The connector API, by contrast, excludes the security extension, so it emits no diff.)
      const ndjson =
        JSON.stringify({
          type: 'action',
          id,
          attributes: {
            name: 'eso-redaction-test',
            actionTypeId: '.index',
            config: { index: 'eso-redaction-test' },
            secrets: { apiKey: 'super-secret-value' },
            isMissingSecrets: false,
          },
          references: [],
        }) + '\n';

      // Scout's apiClient has no multipart helper, so hand-build the form body and set the
      // boundary content-type ourselves (the client preserves a caller-set content-type).
      const body = Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="file"; filename="import.ndjson"\r\n` +
          `Content-Type: application/ndjson\r\n\r\n` +
          `${ndjson}\r\n` +
          `--${boundary}--\r\n`,
        'utf8'
      );

      const res = await apiClient.post('api/saved_objects/_import?overwrite=true', {
        headers: {
          ...cookieHeader,
          ...KBN_HEADERS,
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.success).toBe(true);
      connectorsToCleanUp.push(id);

      const diff = await waitForDiffEvent('saved_object_create', id);
      // The encrypted `secrets` attribute is masked (ESO attrs are ciphertext + redacted)...
      expect(opAt(diff, '/secrets')).toStrictEqual({
        op: 'add',
        path: '/secrets',
        value: '[redacted]',
      });
      // ...while non-encrypted attributes are shown verbatim.
      expect(opAt(diff, '/name')).toMatchObject({ op: 'add', value: 'eso-redaction-test' });
    });
  }
);
