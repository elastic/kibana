/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../constants';
import { apiTest } from '../fixtures';

const FOO_SPACE = 'foo-space';

apiTest.describe('PUT /internal/spaces/space/{id}/solution', { tag: tags.stateful.all }, () => {
  let cookieHeader: Record<string, string>;

  const headers = () => ({ ...COMMON_HEADERS, ...cookieHeader });

  const setSolution = (apiClient: ApiClientFixture, id: string, body: Record<string, string>) =>
    apiClient.put(`internal/spaces/space/${id}/solution`, { headers: headers(), body });

  const resetToClassic = (apiClient: ApiClientFixture, id: string) =>
    setSolution(apiClient, id, { solution: 'classic' });

  apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    await apiServices.spaces.create({ id: FOO_SPACE, name: 'Foo Space' });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.resetViewToClassic('default');
    await apiServices.spaces.delete(FOO_SPACE);
  });

  apiTest(
    'uses solution_type param to set solution on the default space',
    async ({ apiClient }) => {
      await resetToClassic(apiClient, 'default');
      const response = await setSolution(apiClient, 'default', { solution_type: 'observability' });

      expect(response).toHaveStatusCode(200);
      const { solution, name, id } = response.body;
      expect({ id, name, solution }).toStrictEqual({
        id: 'default',
        name: 'Default',
        solution: 'oblt',
      });
    }
  );

  apiTest('uses solution param to set solution on the default space', async ({ apiClient }) => {
    await resetToClassic(apiClient, 'default');
    const response = await setSolution(apiClient, 'default', { solution: 'oblt' });

    expect(response).toHaveStatusCode(200);
    const { solution, name, id } = response.body;
    expect({ id, name, solution }).toStrictEqual({
      id: 'default',
      name: 'Default',
      solution: 'oblt',
    });
  });

  apiTest(
    'uses solution_type param to set solution on the Foo Space space',
    async ({ apiClient }) => {
      await resetToClassic(apiClient, FOO_SPACE);
      const response = await setSolution(apiClient, FOO_SPACE, { solution_type: 'observability' });

      expect(response).toHaveStatusCode(200);
      const { solution, name, id } = response.body;
      expect({ id, name, solution }).toStrictEqual({
        id: FOO_SPACE,
        name: 'Foo Space',
        solution: 'oblt',
      });
    }
  );

  apiTest('uses solution param to set solution on the Foo Space space', async ({ apiClient }) => {
    await resetToClassic(apiClient, FOO_SPACE);
    const response = await setSolution(apiClient, FOO_SPACE, { solution: 'oblt' });

    expect(response).toHaveStatusCode(200);
    const { solution, name, id } = response.body;
    expect({ id, name, solution }).toStrictEqual({
      id: FOO_SPACE,
      name: 'Foo Space',
      solution: 'oblt',
    });
  });

  apiTest('throws an error if solution_type is not supported', async ({ apiClient }) => {
    const response = await setSolution(apiClient, 'default', { solution_type: 'miami' });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request body]: types that failed validation:\n- [request body.0.solution]: expected at least one defined value but got [undefined]\n- [request body.1.solution_type]: types that failed validation:\n - [request body.solution_type.0]: expected value to equal [security]\n - [request body.solution_type.1]: expected value to equal [observability]\n - [request body.solution_type.2]: expected value to equal [elasticsearch]\n - [request body.solution_type.3]: expected value to equal [search]'
    );
  });

  apiTest('throws an error if solution is not supported', async ({ apiClient }) => {
    const response = await setSolution(apiClient, 'default', { solution: 'miami' });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      '[request body]: types that failed validation:\n- [request body.0.solution]: types that failed validation:\n - [request body.solution.0]: expected value to equal [security]\n - [request body.solution.1]: expected value to equal [oblt]\n - [request body.solution.2]: expected value to equal [es]\n - [request body.solution.3]: expected value to equal [classic]\n- [request body.1.solution_type]: expected at least one defined value but got [undefined]'
    );
  });

  apiTest(
    'throws an error if solution and solution_type are both defined',
    async ({ apiClient }) => {
      const response = await setSolution(apiClient, 'default', {
        solution: 'oblt',
        solution_type: 'observability',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        "[request body]: types that failed validation:\n- [request body.0.solution_type]: Additional properties are not allowed ('solution_type' was unexpected)\n- [request body.1.solution]: Additional properties are not allowed ('solution' was unexpected)"
      );
    }
  );

  apiTest(
    'throws an error if solution and solution_type are not defined',
    async ({ apiClient }) => {
      const response = await setSolution(apiClient, 'default', {});

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        '[request body]: types that failed validation:\n- [request body.0.solution]: expected at least one defined value but got [undefined]\n- [request body.1.solution_type]: expected at least one defined value but got [undefined]'
      );
    }
  );

  apiTest('returns 404 when the space is not found', async ({ apiClient }) => {
    const response = await apiClient.get('internal/spaces/space/not-found-space/solution', {
      headers: headers(),
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body).toStrictEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
    });
  });
});
