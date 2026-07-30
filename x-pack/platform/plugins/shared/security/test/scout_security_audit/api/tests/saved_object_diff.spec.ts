/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';

import { apiTest, AUDIT_LOG_PATH, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

// `index-pattern` is a standard, non-hidden type creatable through the public
// saved objects HTTP API, and its attributes are plain strings — convenient for
// asserting exact diff values.
const TYPE = 'index-pattern';

// Configured in `typesToExclude` on the test server (see config_sets/security_audit/shared.ts).
// A non-hidden, publicly-creatable type whose create schema accepts a bare `{ title }`.
const EXCLUDED_TYPE = 'visualization';

// The public saved objects API is internal-origin gated and state-changing.
const KBN_HEADERS = { 'kbn-xsrf': 'x', 'x-elastic-internal-origin': 'kibana' };

interface JsonPatchOp {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
  oldValue?: unknown;
}

interface SavedObjectDiff {
  format: string;
  ops: JsonPatchOp[];
  noOps: Array<{ path: string }>;
}

interface AuditEvent {
  event?: { action?: string; outcome?: string };
  kibana?: { saved_object?: { id?: string; type?: string }; diff?: SavedObjectDiff };
}

/**
 * Reads the audit log once and returns the diff of the post-write (`outcome: success`)
 * event for a mutation, or `undefined` if none is present. Only that event carries
 * `kibana.diff`; the pre-write event for the same operation does not, so filtering on
 * `diff` presence uniquely selects the event we care about. Useful both for polling and
 * for asserting the ABSENCE of a diff (e.g. excluded types).
 */
const scanForDiff = (action: string, id: string): SavedObjectDiff | undefined => {
  let events: AuditEvent[];
  try {
    events = readFileSync(AUDIT_LOG_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEvent);
  } catch {
    return undefined; // audit log file not created yet
  }
  return events
    .reverse()
    .find(
      (ev) =>
        ev.event?.action === action && ev.kibana?.saved_object?.id === id && ev.kibana?.diff != null
    )?.kibana?.diff;
};

/** Polls the audit log until the diff-bearing event for a mutation appears. */
const waitForDiffEvent = async (
  action: string,
  id: string,
  timeoutMs = 15_000
): Promise<SavedObjectDiff> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const diff = scanForDiff(action, id);
    if (diff) return diff;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${action} diff event for ${TYPE}:${id}`);
};

const opAt = (diff: SavedObjectDiff, path: string) => diff.ops.find((op) => op.path === path);
const noOpPaths = (diff: SavedObjectDiff) => diff.noOps.map((noOp) => noOp.path);

apiTest.describe(
  'Audit log — saved object diffs (ECS file appender)',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    apiTest('create emits add ops with an empty "before"', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const id = `so-diff-create-${Date.now()}`;

      const res = await apiClient.post(`api/saved_objects/${TYPE}/${id}`, {
        headers: { ...cookieHeader, ...KBN_HEADERS },
        body: { attributes: { title: 'created' } },
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);

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
      'does not emit a diff for saved object types in typesToExclude',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...cookieHeader, ...KBN_HEADERS };
        const excludedId = `so-diff-excluded-${Date.now()}`;
        const controlId = `so-diff-control-${Date.now()}`;

        // `visualization` is configured in typesToExclude. Create it first, then a control
        // `index-pattern` (not excluded) to give a definite "the pipeline has flushed" signal.
        const excludedRes = await apiClient.post(
          `api/saved_objects/${EXCLUDED_TYPE}/${excludedId}`,
          { headers, body: { attributes: { title: 'excluded' } }, responseType: 'json' }
        );
        expect(excludedRes).toHaveStatusCode(200);

        const controlRes = await apiClient.post(`api/saved_objects/${TYPE}/${controlId}`, {
          headers,
          body: { attributes: { title: 'control' } },
          responseType: 'json',
        });
        expect(controlRes).toHaveStatusCode(200);

        // Once the control's diff event is present, the earlier excluded-type create has
        // been processed too — so if it were going to emit a diff, it already would have.
        await waitForDiffEvent('saved_object_create', controlId);

        // The excluded type still gets its normal audit event, but no diff-bearing one.
        expect(scanForDiff('saved_object_create', excludedId)).toBeUndefined();
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
