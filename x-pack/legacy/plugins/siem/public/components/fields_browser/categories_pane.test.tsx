/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { mockBrowserFields } from '../../containers/source/mock';

import { CATEGORY_PANE_WIDTH } from './helpers';
import { CategoriesPane } from './categories_pane';
import * as i18n from './translations';

const timelineId = 'test';

describe('CategoriesPane', () => {
  test('it renders the expected title', () => {
    const wrapper = mount(
      <CategoriesPane
        browserFields={mockBrowserFields}
        filteredBrowserFields={mockBrowserFields}
        width={CATEGORY_PANE_WIDTH}
        isLoading={false}
        onCategorySelected={jest.fn()}
        onUpdateColumns={jest.fn()}
        selectedCategoryId={''}
        timelineId={timelineId}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="categories-pane-title"]')
        .first()
        .text()
    ).toEqual(i18n.CATEGORIES);
  });

  test('it renders a "No fields match" message when filteredBrowserFields is empty', () => {
    const wrapper = mount(
      <div>
        <CategoriesPane
          browserFields={mockBrowserFields}
          filteredBrowserFields={{}}
          width={CATEGORY_PANE_WIDTH}
          isLoading={false}
          onCategorySelected={jest.fn()}
          onUpdateColumns={jest.fn()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </div>
    );

    expect(
      wrapper
        .find('[data-test-subj="categories-container"] tbody')
        .first()
        .text()
    ).toEqual(i18n.NO_FIELDS_MATCH);
  });
});
