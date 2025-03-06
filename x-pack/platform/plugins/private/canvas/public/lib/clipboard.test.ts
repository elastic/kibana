/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/kibana-utils-plugin/public');

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { setClipboardData, getClipboardData } from './clipboard';
import { LOCALSTORAGE_CLIPBOARD } from '../../common/lib/constants';
import { elements } from '../../__fixtures__/workpads';

const set = jest.fn();
const get = jest.fn();

describe('clipboard', () => {
  beforeAll(() => {
    // @ts-expect-error
    Storage.mockImplementation(() => ({
      set,
      get,
    }));
  });

  test('stores data to local storage', () => {
    setClipboardData(elements);

    expect(set).toBeCalledWith(LOCALSTORAGE_CLIPBOARD, JSON.stringify(elements));
  });

  test('gets data from local storage', () => {
    getClipboardData();

    expect(get).toBeCalledWith(LOCALSTORAGE_CLIPBOARD);
  });
});
