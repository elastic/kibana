/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { mockBrowserFields } from '../../containers/source/mock';
import { TestProviders } from '../../mock';
import { defaultHeaders } from '../timeline/body/column_headers/default_headers';

import { Header } from './header';

const timelineId = 'test';

describe('Header', () => {
  test('it renders the field browser title', () => {
    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={mockBrowserFields}
          isSearching={false}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="field-browser-title"]')
        .first()
        .text()
    ).toEqual('Customize Columns');
  });

  test('it renders the Reset Fields button', () => {
    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={mockBrowserFields}
          isSearching={false}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="reset-fields"]')
        .first()
        .text()
    ).toEqual('Reset Fields');
  });

  test('it invokes onUpdateColumns when the user clicks the Reset Fields button', () => {
    const onUpdateColumns = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={mockBrowserFields}
          isSearching={false}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={onUpdateColumns}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="reset-fields"]')
      .first()
      .simulate('click');

    expect(onUpdateColumns).toBeCalledWith(defaultHeaders);
  });

  test('it invokes onOutsideClick when the user clicks the Reset Fields button', () => {
    const onOutsideClick = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={mockBrowserFields}
          isSearching={false}
          onOutsideClick={onOutsideClick}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="reset-fields"]')
      .first()
      .simulate('click');

    expect(onOutsideClick).toBeCalled();
  });

  test('it renders the field search input with the expected placeholder text when the searchInput prop is empty', () => {
    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={mockBrowserFields}
          isSearching={false}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="field-search"]')
        .first()
        .props().placeholder
    ).toEqual('Field name');
  });

  test('it renders the "current" search value in the input when searchInput is not empty', () => {
    const searchInput = 'aFieldName';

    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={mockBrowserFields}
          isSearching={false}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput={searchInput}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('input').props().value).toEqual(searchInput);
  });

  test('it renders the field search input with a spinner when isSearching is true', () => {
    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={mockBrowserFields}
          isSearching={true}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('.euiLoadingSpinner')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it invokes onSearchInputChange when the user types in the search field', () => {
    const onSearchInputChange = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={mockBrowserFields}
          isSearching={false}
          onOutsideClick={jest.fn()}
          onSearchInputChange={onSearchInputChange}
          onUpdateColumns={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { value: 'timestamp' } });
    wrapper.update();

    expect(onSearchInputChange).toBeCalled();
  });

  test('it returns the expected categories count when filteredBrowserFields is empty', () => {
    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={{}}
          isSearching={false}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="categories-count"]')
        .first()
        .text()
    ).toEqual('0 categories');
  });

  test('it returns the expected categories count when filteredBrowserFields is NOT empty', () => {
    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={mockBrowserFields}
          isSearching={false}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="categories-count"]')
        .first()
        .text()
    ).toEqual('9 categories');
  });

  test('it returns the expected fields count when filteredBrowserFields is empty', () => {
    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={{}}
          isSearching={false}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="fields-count"]')
        .first()
        .text()
    ).toEqual('0 fields');
  });

  test('it returns the expected fields count when filteredBrowserFields is NOT empty', () => {
    const wrapper = mount(
      <TestProviders>
        <Header
          filteredBrowserFields={mockBrowserFields}
          isSearching={false}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="fields-count"]')
        .first()
        .text()
    ).toEqual('25 fields');
  });
});
