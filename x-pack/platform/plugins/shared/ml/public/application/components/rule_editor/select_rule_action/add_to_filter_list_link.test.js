/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent } from '@testing-library/react';

import { AddToFilterListLink } from './add_to_filter_list_link';

describe('AddToFilterListLink', () => {
  test(`renders the add to filter list link for a value`, () => {
    const addItemToFilterList = jest.fn();

    const { container, getByRole } = renderWithI18n(
      <AddToFilterListLink
        fieldValue="elastic.co"
        filterId="safe_domains"
        addItemToFilterList={addItemToFilterList}
      />
    );

    expect(container.firstChild).toMatchSnapshot();

    fireEvent.click(getByRole('button', { name: 'Add elastic.co to safe_domains' }));

    expect(addItemToFilterList).toHaveBeenCalledWith('elastic.co', 'safe_domains', true);
  });
});
