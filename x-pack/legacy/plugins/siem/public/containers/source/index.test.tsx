/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import { mount } from 'enzyme';
import React from 'react';
import { MockedProvider } from '@apollo/react-testing';

import { WithSource, indicesExistOrDataTemporarilyUnavailable } from '.';
import { mockBrowserFields, mockIndexFields, mocksSource } from './mock';

jest.mock('../../lib/kibana');

describe('Index Fields & Browser Fields', () => {
  test('Index Fields', async () => {
    mount(
      <MockedProvider mocks={mocksSource} addTypename={false}>
        <WithSource sourceId="default">
          {({ indexPattern }) => {
            if (!isEqual(indexPattern.fields, [])) {
              expect(indexPattern.fields).toEqual(mockIndexFields);
            }

            return <div />;
          }}
        </WithSource>
      </MockedProvider>
    );
  });

  test('Browser Fields', async () => {
    mount(
      <MockedProvider mocks={mocksSource} addTypename={false}>
        <WithSource sourceId="default">
          {({ browserFields }) => {
            if (!isEqual(browserFields, {})) {
              expect(browserFields).toEqual(mockBrowserFields);
            }

            return <div />;
          }}
        </WithSource>
      </MockedProvider>
    );
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
