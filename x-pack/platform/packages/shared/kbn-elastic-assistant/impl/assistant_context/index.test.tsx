/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useAssistantContext } from '.';
import { TestProviders } from '../mock/test_providers/test_providers';

describe('AssistantContext', () => {
  beforeEach(() => jest.clearAllMocks());

  test('it throws an error when useAssistantContext hook is used without a SecurityAssistantContext', () => {
    expect(() => renderHook(useAssistantContext)).toThrow(
      /useAssistantContext must be used within a AssistantProvider/
    );
  });

  test('it should return the httpFetch function', async () => {
    const { result } = renderHook(useAssistantContext, { wrapper: TestProviders });

    const path = '/path/to/resource';
    await result.current.http.fetch(path);

    expect(result.current.http.fetch).toBeCalledWith(path);
  });
});
