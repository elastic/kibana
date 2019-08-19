/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import 'jest-styled-components';

import { mockBrowserFields } from '../../containers/source/mock';

import { CATEGORY_PANE_WIDTH, getFieldCount } from './helpers';
import { CategoriesPane } from './categories_pane';

const timelineId = 'test';

describe('getCategoryColumns', () => {
  Object.keys(mockBrowserFields).forEach(categoryId => {
    test(`it renders the ${categoryId} category name (from filteredBrowserFields)`, () => {
      const wrapper = mount(
        <div>
          <CategoriesPane
            browserFields={mockBrowserFields}
            filteredBrowserFields={mockBrowserFields}
            width={CATEGORY_PANE_WIDTH}
            onCategorySelected={jest.fn()}
            onUpdateColumns={jest.fn()}
            selectedCategoryId={''}
            timelineId={timelineId}
          />
        </div>
      );

      expect(
        wrapper
          .find(`.field-browser-category-pane-${categoryId}-${timelineId}`)
          .first()
          .text()
      ).toEqual(categoryId);
    });
  });

  Object.keys(mockBrowserFields).forEach(categoryId => {
    test(`it renders the correct field count for the ${categoryId} category (from filteredBrowserFields)`, () => {
      const wrapper = mount(
        <div>
          <CategoriesPane
            browserFields={mockBrowserFields}
            filteredBrowserFields={mockBrowserFields}
            width={CATEGORY_PANE_WIDTH}
            onCategorySelected={jest.fn()}
            onUpdateColumns={jest.fn()}
            selectedCategoryId={''}
            timelineId={timelineId}
          />
        </div>
      );

      expect(
        wrapper
          .find(`[data-test-subj="${categoryId}-category-count"]`)
          .first()
          .text()
      ).toEqual(`${getFieldCount(mockBrowserFields[categoryId])}`);
    });
  });

  test('it renders a hover actions panel for the category name', () => {
    const wrapper = mount(
      <div>
        <CategoriesPane
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          width={CATEGORY_PANE_WIDTH}
          onCategorySelected={jest.fn()}
          onUpdateColumns={jest.fn()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </div>
    );

    expect(
      wrapper
        .find('[data-test-subj="category-link"]')
        .first()
        .find('[data-test-subj="hover-actions-panel-container"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the selected category with bold text', () => {
    const selectedCategoryId = 'auditd';

    const wrapper = mount(
      <div>
        <CategoriesPane
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          width={CATEGORY_PANE_WIDTH}
          onCategorySelected={jest.fn()}
          onUpdateColumns={jest.fn()}
          selectedCategoryId={selectedCategoryId}
          timelineId={timelineId}
        />
      </div>
    );

    expect(
      wrapper.find(`.field-browser-category-pane-${selectedCategoryId}-${timelineId}`).first()
    ).toHaveStyleRule('font-weight', 'bold');
  });

  test('it does NOT render an un-selected category with bold text', () => {
    const selectedCategoryId = 'auditd';
    const notTheSelectedCategoryId = 'base';

    const wrapper = mount(
      <div>
        <CategoriesPane
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          width={CATEGORY_PANE_WIDTH}
          onCategorySelected={jest.fn()}
          onUpdateColumns={jest.fn()}
          selectedCategoryId={selectedCategoryId}
          timelineId={timelineId}
        />
      </div>
    );

    expect(
      wrapper.find(`.field-browser-category-pane-${notTheSelectedCategoryId}-${timelineId}`).first()
    ).toHaveStyleRule('font-weight', 'normal');
  });

  test('it invokes onCategorySelected when a user clicks a category', () => {
    const selectedCategoryId = 'auditd';
    const notTheSelectedCategoryId = 'base';

    const onCategorySelected = jest.fn();

    const wrapper = mount(
      <div>
        <CategoriesPane
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          width={CATEGORY_PANE_WIDTH}
          onCategorySelected={onCategorySelected}
          onUpdateColumns={jest.fn()}
          selectedCategoryId={selectedCategoryId}
          timelineId={timelineId}
        />
      </div>
    );

    wrapper
      .find(`.field-browser-category-pane-${notTheSelectedCategoryId}-${timelineId}`)
      .first()
      .simulate('click');

    expect(onCategorySelected).toHaveBeenCalledWith(notTheSelectedCategoryId);
  });
});
