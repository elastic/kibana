/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockDetailItemData, mockDetailItemDataId } from '../../mock/mock_detail_item';
import { TestProviders } from '../../mock/test_providers';

import { EventFieldsBrowser } from './event_fields_browser';
import { mockBrowserFields } from '../../containers/source/mock';

describe('EventFieldsBrowser', () => {
  describe('column headers', () => {
    ['Field', 'Value', 'Description'].forEach(header => {
      test(`it renders the ${header} column header`, () => {
        const wrapper = mountWithIntl(
          <TestProviders>
            <EventFieldsBrowser
              browserFields={mockBrowserFields}
              data={mockDetailItemData}
              eventId={mockDetailItemDataId}
              isLoading={false}
              onUpdateColumns={jest.fn()}
              timelineId="test"
            />
          </TestProviders>
        );

        expect(wrapper.find('thead').containsMatchingElement(<span>{header}</span>)).toBeTruthy();
      });
    });
  });

  describe('filter input', () => {
    test('it renders a filter input with the expected placeholder', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={mockDetailItemDataId}
            isLoading={false}
            onUpdateColumns={jest.fn()}
            timelineId="test"
          />
        </TestProviders>
      );

      expect(wrapper.find('input[type="search"]').props().placeholder).toEqual(
        'Filter by Field, Value, or Description...'
      );
    });
  });

  describe('field type icon', () => {
    test('it renders the expected icon type for the data provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={mockDetailItemDataId}
            isLoading={false}
            onUpdateColumns={jest.fn()}
            timelineId="test"
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(0)
          .find('svg')
          .exists()
      ).toEqual(true);
    });
  });

  describe('field', () => {
    test('it renders the field name for the data provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={mockDetailItemDataId}
            isLoading={false}
            onUpdateColumns={jest.fn()}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(
        wrapper
          .find('[data-test-subj="field-name"]')
          .at(0)
          .text()
      ).toEqual('@timestamp');
    });
  });

  describe('value', () => {
    test('it renders the expected value for the data provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={mockDetailItemDataId}
            isLoading={false}
            onUpdateColumns={jest.fn()}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(
        wrapper
          .find('[data-test-subj="draggable-content"]')
          .at(0)
          .text()
      ).toEqual('Feb 28, 2019 @ 16:50:54.621');
    });
  });

  describe('description', () => {
    test('it renders the expected field description the data provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <EventFieldsBrowser
            browserFields={mockBrowserFields}
            data={mockDetailItemData}
            eventId={mockDetailItemDataId}
            isLoading={false}
            onUpdateColumns={jest.fn()}
            timelineId="test"
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('.euiTableRow')
          .find('.euiTableRowCell')
          .at(3)
          .text()
      ).toContain(
        'DescriptionDate/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events. Example: 2016-05-23T08:05:34.853Z'
      );
    });
  });
});
