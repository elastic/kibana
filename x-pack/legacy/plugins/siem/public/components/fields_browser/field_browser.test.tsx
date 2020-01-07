/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { mockBrowserFields } from '../../containers/source/mock';
import { TestProviders } from '../../mock';

import { FieldsBrowser } from './field_browser';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from './helpers';

describe('FieldsBrowser', () => {
  const timelineId = 'test';

  // `enzyme` doesn't mount the components into the global jsdom `document`
  // but that's where the click detector listener is, so for testing, we
  // pass the top-level mounted component's click event on to document
  const triggerDocumentMouseDown = () => {
    const event = new Event('mousedown');
    document.dispatchEvent(event);
  };

  const triggerDocumentMouseUp = () => {
    const event = new Event('mouseup');
    document.dispatchEvent(event);
  };

  test('it invokes onOutsideClick when onFieldSelected is undefined, and the user clicks outside the fields browser', () => {
    const onOutsideClick = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <div
          data-test-subj="outside"
          onMouseDown={triggerDocumentMouseDown}
          onMouseUp={triggerDocumentMouseUp}
        >
          <FieldsBrowser
            browserFields={mockBrowserFields}
            columnHeaders={[]}
            filteredBrowserFields={mockBrowserFields}
            height={FIELD_BROWSER_HEIGHT}
            isSearching={false}
            searchInput={''}
            selectedCategoryId={''}
            timelineId={timelineId}
            toggleColumn={jest.fn()}
            width={FIELD_BROWSER_WIDTH}
            onCategorySelected={jest.fn()}
            onHideFieldBrowser={jest.fn()}
            onOutsideClick={onOutsideClick}
            onSearchInputChange={jest.fn()}
            onUpdateColumns={jest.fn()}
          />
        </div>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="outside"]').simulate('mousedown');
    wrapper.find('[data-test-subj="outside"]').simulate('mouseup');

    expect(onOutsideClick).toHaveBeenCalled();
  });

  test('it does NOT invoke onOutsideClick when onFieldSelected is defined, and the user clicks outside the fields browser', () => {
    const onOutsideClick = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <div
          data-test-subj="outside"
          onMouseDown={triggerDocumentMouseDown}
          onMouseUp={triggerDocumentMouseUp}
        >
          <FieldsBrowser
            browserFields={mockBrowserFields}
            columnHeaders={[]}
            filteredBrowserFields={mockBrowserFields}
            height={FIELD_BROWSER_HEIGHT}
            isSearching={false}
            searchInput={''}
            selectedCategoryId={''}
            timelineId={timelineId}
            toggleColumn={jest.fn()}
            width={FIELD_BROWSER_WIDTH}
            onCategorySelected={jest.fn()}
            onFieldSelected={jest.fn()}
            onHideFieldBrowser={jest.fn()}
            onOutsideClick={onOutsideClick}
            onSearchInputChange={jest.fn()}
            onUpdateColumns={jest.fn()}
          />
        </div>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="outside"]').simulate('mousedown');
    wrapper.find('[data-test-subj="outside"]').simulate('mouseup');

    expect(onOutsideClick).not.toHaveBeenCalled();
  });

  test('it renders the header', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          browserFields={mockBrowserFields}
          columnHeaders={[]}
          filteredBrowserFields={mockBrowserFields}
          height={FIELD_BROWSER_HEIGHT}
          isSearching={false}
          searchInput={''}
          selectedCategoryId={''}
          timelineId={timelineId}
          toggleColumn={jest.fn()}
          width={FIELD_BROWSER_WIDTH}
          onCategorySelected={jest.fn()}
          onHideFieldBrowser={jest.fn()}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header"]').exists()).toBe(true);
  });

  test('it renders the categories pane', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          browserFields={mockBrowserFields}
          columnHeaders={[]}
          filteredBrowserFields={mockBrowserFields}
          height={FIELD_BROWSER_HEIGHT}
          isSearching={false}
          searchInput={''}
          selectedCategoryId={''}
          timelineId={timelineId}
          toggleColumn={jest.fn()}
          width={FIELD_BROWSER_WIDTH}
          onCategorySelected={jest.fn()}
          onHideFieldBrowser={jest.fn()}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="left-categories-pane"]').exists()).toBe(true);
  });

  test('it renders the fields pane', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          browserFields={mockBrowserFields}
          columnHeaders={[]}
          filteredBrowserFields={mockBrowserFields}
          height={FIELD_BROWSER_HEIGHT}
          isSearching={false}
          searchInput={''}
          selectedCategoryId={''}
          timelineId={timelineId}
          toggleColumn={jest.fn()}
          width={FIELD_BROWSER_WIDTH}
          onCategorySelected={jest.fn()}
          onHideFieldBrowser={jest.fn()}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="fields-pane"]').exists()).toBe(true);
  });

  test('focuses the search input when the component mounts', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          browserFields={mockBrowserFields}
          columnHeaders={[]}
          filteredBrowserFields={mockBrowserFields}
          height={FIELD_BROWSER_HEIGHT}
          isSearching={false}
          searchInput={''}
          selectedCategoryId={''}
          timelineId={timelineId}
          toggleColumn={jest.fn()}
          width={FIELD_BROWSER_WIDTH}
          onCategorySelected={jest.fn()}
          onHideFieldBrowser={jest.fn()}
          onOutsideClick={jest.fn()}
          onSearchInputChange={jest.fn()}
          onUpdateColumns={jest.fn()}
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="field-search"]')
        .first()
        .getDOMNode().id === document.activeElement!.id
    ).toBe(true);
  });

  test('it invokes onSearchInputChange when the user types in the field search input', () => {
    const onSearchInputChange = jest.fn();
    const inputText = 'event.category';

    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          browserFields={mockBrowserFields}
          columnHeaders={[]}
          filteredBrowserFields={mockBrowserFields}
          height={FIELD_BROWSER_HEIGHT}
          isSearching={false}
          searchInput={''}
          selectedCategoryId={''}
          timelineId={timelineId}
          toggleColumn={jest.fn()}
          width={FIELD_BROWSER_WIDTH}
          onCategorySelected={jest.fn()}
          onHideFieldBrowser={jest.fn()}
          onOutsideClick={jest.fn()}
          onSearchInputChange={onSearchInputChange}
          onUpdateColumns={jest.fn()}
        />
      </TestProviders>
    );

    const searchField = wrapper.find('[data-test-subj="field-search"]').first();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changeEvent: any = { target: { value: inputText } };
    const onChange = searchField.props().onChange;

    onChange!(changeEvent);
    searchField.simulate('change').update();

    expect(onSearchInputChange).toBeCalledWith(inputText);
  });
});
