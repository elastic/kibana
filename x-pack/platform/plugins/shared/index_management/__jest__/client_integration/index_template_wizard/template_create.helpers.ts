/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';

import type { setupEnvironment } from '../helpers/setup_environment';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const expectString = (value: unknown): string => {
  expect(typeof value).toBe('string');
  return value as string;
};

type HttpPost = ReturnType<typeof setupEnvironment>['httpSetup']['post'];

const normalizePostCall = (call: readonly unknown[]) => {
  // Some http typings model `post()` as `(optionsWithPath)` instead of `(path, options)`.
  // Normalize both shapes without using `any`.
  const first = call[0];
  const second = call[1];

  if (typeof first === 'string') {
    expect(isRecord(second)).toBe(true);
    return { path: first, options: second as Record<string, unknown> };
  }

  expect(isRecord(first)).toBe(true);
  const options = first as Record<string, unknown>;
  return { path: expectString(options.path), options };
};

export const getPostCalls = (post: HttpPost) => {
  const postMock = jest.mocked(post);
  return postMock.mock.calls.map((call) =>
    normalizePostCall(call as unknown as readonly unknown[])
  );
};

export const getLastPostCall = (post: HttpPost) => {
  const postMock = jest.mocked(post);
  const lastCall = postMock.mock.calls.at(-1);
  expect(lastCall).toBeDefined();

  return normalizePostCall(lastCall as unknown as readonly unknown[]);
};

export const clickSaveAndAwaitExit = async () => {
  fireEvent.click(screen.getByTestId('nextButton'));
  // Save triggers async state updates (`isSaving`) and a router navigation on success.
  // Waiting for the wizard UI to unmount ensures those updates are wrapped/awaited.
  await waitFor(() => expect(screen.queryByTestId('nextButton')).not.toBeInTheDocument());
};
