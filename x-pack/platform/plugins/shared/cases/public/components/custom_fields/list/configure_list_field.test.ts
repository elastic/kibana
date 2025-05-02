/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CustomFieldTypes,
  type ListCustomFieldConfiguration,
} from '../../../../common/types/domain';
import { configureListCustomFieldFactory } from './configure_list_field';

describe('configureListCustomFieldFactory ', () => {
  const builder = configureListCustomFieldFactory();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    expect(builder).toEqual({
      id: 'list',
      label: 'List',
      getEuiTableColumn: expect.any(Function),
      build: expect.any(Function),
      sanitizeTemplateValue: expect.any(Function),
      getFilterOptions: expect.any(Function),
      convertValueToDisplayText: expect.any(Function),
    });
  });

  describe('sanitizeTemplateValue', () => {
    it('returns the first value in the field configuration when passed an option that does not exist', () => {
      const { sanitizeTemplateValue } = builder;
      const mockConfiguration: ListCustomFieldConfiguration = {
        type: CustomFieldTypes.LIST,
        key: 'mock',
        label: 'mock',
        required: false,
        options: [
          {
            key: '0',
            label: 'A',
          },
          {
            key: '1',
            label: 'B',
          },
        ],
      };
      const sanizitedValue = sanitizeTemplateValue!({ '2': 'C' }, mockConfiguration);
      expect(sanizitedValue).toMatchInlineSnapshot(`
        Object {
          "0": "A",
        }
      `);
    });
  });
});
