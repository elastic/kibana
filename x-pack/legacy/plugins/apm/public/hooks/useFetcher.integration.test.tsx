/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-testing-library';
import { delay, tick } from '../utils/testHelpers';
import { useFetcher } from './useFetcher';

// Suppress warnings about "act" until async/await syntax is supported: https://github.com/facebook/react/issues/14769
/* eslint-disable no-console */
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

async function asyncFn(name: string, ms: number) {
  await delay(ms);
  return `Hello from ${name}`;
}

describe('when simulating race condition', () => {
  let requestCallOrder: Array<[string, string, number]>;
  let renderSpy: jest.Mock;

  beforeEach(async () => {
    jest.useFakeTimers();

    renderSpy = jest.fn();
    requestCallOrder = [];

    function MyComponent({
      name,
      ms,
      renderFn
    }: {
      name: string;
      ms: number;
      renderFn: any;
    }) {
      const { data, status, error } = useFetcher(async () => {
        requestCallOrder.push(['request', name, ms]);
        const res = await asyncFn(name, ms);
        requestCallOrder.push(['response', name, ms]);
        return res;
      }, [name, ms]);
      renderFn({ data, status, error });
      return null;
    }

    const { rerender } = render(
      <MyComponent name="John" ms={500} renderFn={renderSpy} />
    );

    rerender(<MyComponent name="Peter" ms={100} renderFn={renderSpy} />);
  });

  it('should render initially render loading state', async () => {
    expect(renderSpy).lastCalledWith({
      data: undefined,
      error: undefined,
      status: 'loading'
    });
  });

  it('should render "Hello from Peter" after 200ms', async () => {
    jest.advanceTimersByTime(200);
    await tick();

    expect(renderSpy).lastCalledWith({
      data: 'Hello from Peter',
      error: undefined,
      status: 'success'
    });
  });

  it('should render "Hello from Peter" after 600ms', async () => {
    jest.advanceTimersByTime(600);
    await tick();

    expect(renderSpy).lastCalledWith({
      data: 'Hello from Peter',
      error: undefined,
      status: 'success'
    });
  });

  it('should should NOT have rendered "Hello from John" at any point', async () => {
    jest.advanceTimersByTime(600);
    await tick();

    expect(renderSpy).not.toHaveBeenCalledWith({
      data: 'Hello from John',
      error: undefined,
      status: 'success'
    });
  });

  it('should send and receive calls in the right order', async () => {
    jest.advanceTimersByTime(600);
    await tick();

    expect(requestCallOrder).toEqual([
      ['request', 'John', 500],
      ['request', 'Peter', 100],
      ['response', 'Peter', 100],
      ['response', 'John', 500]
    ]);
  });
});
