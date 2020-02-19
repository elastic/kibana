/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { renderHook } from '@testing-library/react-hooks';

import { useWithSource, indicesExistOrDataTemporarilyUnavailable } from '.';
import { mockBrowserFields, mockIndexFields, mocksSource } from './mock';

jest.mock('../../lib/kibana');

describe('Index Fields & Browser Fields', () => {
  test('Index Fields', async () => {
    const wrapper: React.ComponentType = ({ children }) => (
      <MockedProvider mocks={mocksSource} addTypename={false}>
        {(children as unknown) as undefined}
      </MockedProvider>
    );
    const { result, waitForNextUpdate } = renderHook(() => useWithSource(), { wrapper });

    await waitForNextUpdate();

    expect(result.current.indexPattern.fields).toEqual(mockIndexFields);
  });

  test('Browser Fields', async () => {
    const wrapper: React.ComponentType = ({ children }) => (
      <MockedProvider mocks={mocksSource} addTypename={false}>
        {(children as unknown) as undefined}
      </MockedProvider>
    );
    const { result, waitForNextUpdate } = renderHook(() => useWithSource(), { wrapper });
    await waitForNextUpdate();

    expect(result.current.browserFields).toEqual(mockBrowserFields);
  });

  describe('indicesExistOrDataTemporarilyUnavailable', () => {
    test('it returns true when undefined', () => {
      let undefVar;
      const result = indicesExistOrDataTemporarilyUnavailable(undefVar);
      expect(result).toBeTruthy();
    });
    test('it returns true when true', () => {
      const result = indicesExistOrDataTemporarilyUnavailable(true);
      expect(result).toBeTruthy();
    });
    test('it returns false when false', () => {
      const result = indicesExistOrDataTemporarilyUnavailable(false);
      expect(result).toBeFalsy();
    });
  });
});
