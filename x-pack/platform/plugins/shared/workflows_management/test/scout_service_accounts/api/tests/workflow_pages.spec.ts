/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import type { ApiClientFixture } from '@kbn/scout';
import { apiTest, AUDIT_LOG_PATH } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import {
  authenticationStep,
  createServiceAccountSuite,
  waitStep,
} from '../fixtures/service_account_suite';

const PAGES_SETTING = 'workflows:pages:enabled';
const FORM = { 'content-type': 'application/x-www-form-urlencoded' };
const USER_AGENT = `scout-workflow-pages-${Date.now()}`;
// Creating, running, and waiting for a service-account run takes longer than the default.
const RUN_TEST_TIMEOUT_MS = 120_000;

const DEFAULT_PAGE_STEPS = `${authenticationStep}  - name: echo
    type: console
    with:
      message: "{{ page.inputs.summary }} x{{ page.inputs.count }}"
`;

const pageYaml = (
  accountId: string,
  {
    steps = DEFAULT_PAGE_STEPS,
    settings = '',
    before = '',
  }: { steps?: string; settings?: string; before?: string } = {}
) => `name: Bug intake
enabled: true
settings:
  run_as: ${accountId}
${settings}${before}triggers:
  - type: page
    title: Report a bug
    inputs:
      properties:
        summary:
          type: string
          minLength: 3
        count:
          type: number
      required: [summary]
steps:
${steps}`;

interface AuditRecord {
  '@timestamp'?: string;
  event?: { action?: string; outcome?: string };
  message?: string;
  user_agent?: { original?: string };
  client?: { ip?: string };
}

const readAuditLog = (): AuditRecord[] => {
  try {
    return readFileSync(AUDIT_LOG_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditRecord);
  } catch {
    return [];
  }
};

apiTest.describe(
  '[NON-MKI] Workflow pages: public routes',
  { tag: ['@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();

    apiTest.beforeAll(setup);

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(teardown);

    const internal = () => ({ ...getContext().headers, 'elastic-api-version': '1' });
    const pageApi = (id: string) => `internal/workflows/workflow/${id}/pages/default`;

    /** Creates a bound workflow with a page, publishes the page, and returns its public path. */
    const createPublishedPage = async (apiClient: ApiClientFixture, yaml?: string) => {
      const { accountId, create } = getContext();
      const id = await create(apiClient, yaml ?? pageYaml(accountId));
      const published = await apiClient.put(`${pageApi(id)}/access`, {
        headers: internal(),
        body: { access: { level: 'secret_link' } },
        responseType: 'json',
      });
      expect(published, JSON.stringify(published.body)).toHaveStatusCode(200);
      const page = await apiClient.get(pageApi(id), { headers: internal(), responseType: 'json' });
      expect(page).toHaveStatusCode(200);
      expect(page.body.status).toStrictEqual({ online: true, reasons: [] });
      return { id, path: (page.body.url as string).replace(/^\//, '') };
    };

    const listExecutions = async (apiClient: ApiClientFixture, id: string) => {
      const response = await apiClient.get(`api/workflows/workflow/${id}/executions`, {
        headers: getContext().headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body.results as WorkflowExecutionDto[];
    };

    const submit = (apiClient: ApiClientFixture, path: string, form: string) =>
      apiClient.post(path, { headers: { ...FORM, 'user-agent': USER_AGENT }, body: form });

    /** Checks that a run used the service account, also for steps that ran after a resume. */
    const expectRunsAs = (execution: WorkflowExecutionDto, accountId: string) => {
      expect(execution.effectiveIdentity).toStrictEqual({ type: 'service_account', id: accountId });
      expect(
        JSON.stringify(
          execution.stepExecutions?.find((step) => step.stepId === 'authenticate')?.output
        )
      ).toContain(accountId);
    };

    const resumeApproval = async (apiClient: ApiClientFixture, execution: WorkflowExecutionDto) => {
      const response = await apiClient.post(`api/workflows/executions/${execution.id}/resume`, {
        headers: getContext().headers,
        body: {
          input: { approved: true },
          stepExecutionId: execution.stepExecutions?.find((step) => step.stepId === 'approval')?.id,
        },
        responseType: 'json',
      });
      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
    };

    apiTest(
      'a valid secret does not open another workflow, page, or space',
      async ({ apiClient, kbnClient }) => {
        const pageA = await createPublishedPage(apiClient);
        const pageB = await createPublishedPage(apiClient);
        const secretA = pageA.path.split('/k/')[1];
        const space = `pages-isolation-${Date.now()}`;
        await kbnClient.spaces.create({ id: space, name: space });

        try {
          for (const path of [
            `pages/${pageB.id}/default/k/${secretA}`,
            `pages/${pageA.id}/other/k/${secretA}`,
            `s/${space}/pages/${pageA.id}/default/k/${secretA}`,
          ]) {
            expect(await apiClient.get(path, { responseType: 'text' }), path).toHaveStatusCode(404);
            expect(await submit(apiClient, path, 'summary=Login+fails'), path).toHaveStatusCode(
              404
            );
          }
        } finally {
          await kbnClient.spaces.delete(space);
        }

        expect(await listExecutions(apiClient, pageA.id)).toStrictEqual([]);
        expect(await listExecutions(apiClient, pageB.id)).toStrictEqual([]);
      }
    );

    apiTest(
      'a submitted expression stays literal and the identity holds through a resume and a child run',
      async ({ apiClient }) => {
        apiTest.setTimeout(RUN_TEST_TIMEOUT_MS * 2);
        const { accountId, create, wait } = getContext();
        const secretConsts = 'consts:\n  secret: hidden-value\n';
        const childId = await create(
          apiClient,
          `name: Page child
enabled: true
settings:
  run_as: ${accountId}
${secretConsts}triggers:
  - type: manual
steps:
${authenticationStep}  - name: echo
    type: console
    with:
      message: "{{ inputs.summary }}"
`
        );
        const { id, path } = await createPublishedPage(
          apiClient,
          pageYaml(accountId, {
            before: secretConsts,
            steps: `${waitStep}  - name: echo
    type: console
    with:
      message: "{{ page.inputs.summary }}"
  - name: child
    type: workflow.execute
    with:
      workflow-id: ${childId}
      inputs:
        summary: "{{ page.inputs.summary }}"
${authenticationStep}`,
          })
        );

        const submitted = await submit(
          apiClient,
          path,
          `summary=${encodeURIComponent('${{ consts.secret }}')}`
        );
        expect(submitted).toHaveStatusCode(303);
        await expect.poll(async () => (await listExecutions(apiClient, id)).length).toBe(1);
        const [{ id: executionId }] = await listExecutions(apiClient, id);
        await resumeApproval(apiClient, await wait(apiClient, executionId, 'waiting_for_input'));

        const parent = await wait(apiClient, executionId);
        expectRunsAs(parent, accountId);
        expect(parent.stepExecutions?.find((step) => step.stepId === 'echo')?.output).toBe(
          '${{ consts.secret }}'
        );
        const childExecutionId = parent.stepExecutions?.find((step) => step.stepId === 'child')
          ?.state?.executionId;
        const child = await wait(apiClient, String(childExecutionId));
        expectRunsAs(child, accountId);
        expect(child.stepExecutions?.find((step) => step.stepId === 'echo')?.output).toBe(
          '${{ consts.secret }}'
        );
      }
    );

    apiTest('a queued page run keeps the service account', async ({ apiClient }) => {
      apiTest.setTimeout(RUN_TEST_TIMEOUT_MS * 2);
      const { accountId, wait } = getContext();
      const { id, path } = await createPublishedPage(
        apiClient,
        pageYaml(accountId, {
          settings: `  concurrency:\n    max: 1\n    strategy: queue\n    key: pages-queue-${Date.now()}\n`,
          steps: waitStep + authenticationStep,
        })
      );

      expect(await submit(apiClient, path, 'summary=First')).toHaveStatusCode(303);
      await expect.poll(async () => (await listExecutions(apiClient, id)).length).toBe(1);
      const [{ id: firstId }] = await listExecutions(apiClient, id);
      const first = await wait(apiClient, firstId, 'waiting_for_input');
      expect(await submit(apiClient, path, 'summary=Second')).toHaveStatusCode(303);
      await expect.poll(async () => (await listExecutions(apiClient, id)).length).toBe(2);
      const secondId = (await listExecutions(apiClient, id)).find(
        (execution) => execution.id !== firstId
      )?.id;
      await wait(apiClient, String(secondId), 'queued');

      await resumeApproval(apiClient, first);
      expectRunsAs(await wait(apiClient, firstId), accountId);
      await resumeApproval(apiClient, await wait(apiClient, String(secondId), 'waiting_for_input'));
      expectRunsAs(await wait(apiClient, String(secondId)), accountId);
    });

    apiTest(
      'a valid submission runs as the service account and redirects',
      async ({ apiClient }) => {
        apiTest.setTimeout(RUN_TEST_TIMEOUT_MS);
        const { accountId, wait } = getContext();
        const { id, path } = await createPublishedPage(apiClient);
        const since = Date.now();

        const form = await apiClient.get(path, { responseType: 'text' });
        expect(form).toHaveStatusCode(200);
        expect(form.body).toContain('Report a bug');
        expect(form.body).toContain('not Elastic');

        const submitted = await submit(apiClient, path, 'summary=Login+fails&count=2');
        expect(submitted).toHaveStatusCode(303);
        expect(submitted.headers.location).toBe('?submitted=1');

        const confirmation = await apiClient.get(`${path}?submitted=1`, { responseType: 'text' });
        expect(confirmation).toHaveStatusCode(200);
        expect(confirmation.body).toContain('submission was received');

        await expect.poll(async () => (await listExecutions(apiClient, id)).length).toBe(1);
        const [{ id: executionId }] = await listExecutions(apiClient, id);
        const execution = await wait(apiClient, executionId);
        expect(execution.triggeredBy).toBe('page');
        expect(execution.effectiveIdentity).toStrictEqual({
          type: 'service_account',
          id: accountId,
        });
        expect(execution.context?.page).toStrictEqual({
          inputs: { summary: 'Login fails', count: 2 },
        });
        expect(execution.stepExecutions?.find((step) => step.stepId === 'echo')?.output).toBe(
          'Login fails x2'
        );
        // The visitor's network details stay in the audit log, never on the execution.
        expect(JSON.stringify(execution)).not.toContain(USER_AGENT);

        const findSubmitEvent = () =>
          readAuditLog().find(
            (record) =>
              Date.parse(record['@timestamp'] ?? '') >= since &&
              record.event?.action === 'workflow_page_submit' &&
              record.message?.includes(`[workflowId=${id}]`)
          );
        await expect.poll(() => findSubmitEvent() !== undefined).toBe(true);
        const event = findSubmitEvent();
        expect(event?.event?.outcome).toBe('success');
        expect(event?.user_agent?.original).toBe(USER_AGENT);
        expect(typeof event?.client?.ip).toBe('string');
      }
    );

    apiTest(
      'invalid input returns the form with the errors and starts no run',
      async ({ apiClient }) => {
        const { id, path } = await createPublishedPage(apiClient);

        const response = await apiClient.post(path, {
          headers: FORM,
          body: 'summary=ab',
          responseType: 'text',
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body).toContain('role="alert"');
        expect(response.body).toContain('value="ab"');
        expect(await listExecutions(apiClient, id)).toStrictEqual([]);
      }
    );

    apiTest('every offline state returns the same 404, never a 401', async ({ apiClient }) => {
      const { id, path } = await createPublishedPage(apiClient);
      const expectNotFound = async (url: string) => {
        expect(await apiClient.get(url, { responseType: 'text' })).toHaveStatusCode(404);
        expect(await submit(apiClient, url, 'summary=Login+fails')).toHaveStatusCode(404);
      };
      const setPage = async (change: 'enabled' | 'access', body: object) => {
        const response = await apiClient.put(`${pageApi(id)}/${change}`, {
          headers: internal(),
          body,
          responseType: 'json',
        });
        expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      };

      await expectNotFound(path.replace(/\/k\/.+$/, '/k/wrong-secret'));

      await setPage('enabled', { enabled: false });
      await expectNotFound(path);
      await setPage('enabled', { enabled: true });

      await setPage('access', { access: null });
      await expectNotFound(path);
      await setPage('access', { access: { level: 'secret_link' } });

      const disabled = await apiClient.put(`api/workflows/workflow/${id}`, {
        headers: getContext().headers,
        body: { enabled: false },
        responseType: 'json',
      });
      expect(disabled).toHaveStatusCode(200);
      await expectNotFound(path);

      expect(await listExecutions(apiClient, id)).toStrictEqual([]);
    });

    apiTest('rotating the secret takes the old URL offline at once', async ({ apiClient }) => {
      const { id, path } = await createPublishedPage(apiClient);

      const rotated = await apiClient.post(`${pageApi(id)}/_rotate`, {
        headers: internal(),
        responseType: 'json',
      });
      expect(rotated).toHaveStatusCode(200);
      const newPath = (rotated.body.url as string).replace(/^\//, '');

      expect(newPath).not.toBe(path);
      expect(await apiClient.get(path, { responseType: 'text' })).toHaveStatusCode(404);
      expect(await apiClient.get(newPath, { responseType: 'text' })).toHaveStatusCode(200);
    });

    apiTest('the kill switch takes every page offline without a restart', async ({ apiClient }) => {
      const { path } = await createPublishedPage(apiClient);
      const setKillSwitch = async (value: boolean | null) => {
        const response = await apiClient.post('internal/kibana/global_settings', {
          headers: getContext().headers,
          body: { changes: { [PAGES_SETTING]: value } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
      };

      try {
        await setKillSwitch(false);
        expect(await apiClient.get(path, { responseType: 'text' })).toHaveStatusCode(404);
      } finally {
        await setKillSwitch(null);
      }
      expect(await apiClient.get(path, { responseType: 'text' })).toHaveStatusCode(200);
    });

    apiTest('the status names a service account that does not exist', async ({ apiClient }) => {
      const { create } = getContext();
      const id = await create(apiClient, pageYaml(`kibana/missing-${Date.now()}`));

      const page = await apiClient.get(pageApi(id), { headers: internal(), responseType: 'json' });

      expect(page).toHaveStatusCode(200);
      expect(page.body.status).toStrictEqual({
        online: false,
        reasons: ['no_access_level', 'service_account_missing'],
      });
    });
  }
);
