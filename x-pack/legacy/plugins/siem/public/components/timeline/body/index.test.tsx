/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import 'jest-styled-components';
import * as React from 'react';

import { mockBrowserFields } from '../../../containers/source/mock';
import { Direction } from '../../../graphql/types';
import { defaultHeaders, mockTimelineData } from '../../../mock';
import { TestProviders } from '../../../mock/test_providers';

import { Body } from '.';
import { columnRenderers, rowRenderers } from './renderers';
import { Sort } from './sort';
import { wait } from '../../../lib/helpers';

const testBodyHeight = 700;
const mockGetNotesByIds = (eventId: string[]) => [];
const mockSort: Sort = {
  columnId: '@timestamp',
  sortDirection: Direction.desc,
};

jest.mock(
  'react-visibility-sensor',
  () => ({ children }: { children: (args: { isVisible: boolean }) => React.ReactNode }) =>
    children({ isVisible: true })
);

describe('Body', () => {
  describe('rendering', () => {
    test('it renders the column headers', () => {
      const wrapper = mount(
        <TestProviders>
          <Body
            addNoteToEvent={jest.fn()}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            columnRenderers={columnRenderers}
            data={mockTimelineData}
            eventIdToNoteIds={{}}
            height={testBodyHeight}
            id={'timeline-test'}
            getNotesByIds={mockGetNotesByIds}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            onFilterChange={jest.fn()}
            onPinEvent={jest.fn()}
            onUnPinEvent={jest.fn()}
            onUpdateColumns={jest.fn()}
            pinnedEventIds={{}}
            range={'1 Day'}
            rowRenderers={rowRenderers}
            sort={mockSort}
            toggleColumn={jest.fn()}
            updateNote={jest.fn()}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="column-headers"]')
          .first()
          .exists()
      ).toEqual(true);
    });

    test('it renders the vertical scroll container', () => {
      const wrapper = mount(
        <TestProviders>
          <Body
            addNoteToEvent={jest.fn()}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            columnRenderers={columnRenderers}
            data={mockTimelineData}
            eventIdToNoteIds={{}}
            height={testBodyHeight}
            id={'timeline-test'}
            getNotesByIds={mockGetNotesByIds}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            onFilterChange={jest.fn()}
            onPinEvent={jest.fn()}
            onUnPinEvent={jest.fn()}
            onUpdateColumns={jest.fn()}
            pinnedEventIds={{}}
            range={'1 Day'}
            rowRenderers={rowRenderers}
            sort={mockSort}
            toggleColumn={jest.fn()}
            updateNote={jest.fn()}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="vertical-scroll-container"]')
          .first()
          .exists()
      ).toEqual(true);
    });

    test('it renders events', () => {
      const wrapper = mount(
        <TestProviders>
          <Body
            addNoteToEvent={jest.fn()}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            columnRenderers={columnRenderers}
            data={mockTimelineData}
            eventIdToNoteIds={{}}
            height={testBodyHeight}
            id={'timeline-test'}
            getNotesByIds={mockGetNotesByIds}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            onFilterChange={jest.fn()}
            onPinEvent={jest.fn()}
            onUnPinEvent={jest.fn()}
            onUpdateColumns={jest.fn()}
            pinnedEventIds={{}}
            range={'1 Day'}
            rowRenderers={rowRenderers}
            sort={mockSort}
            toggleColumn={jest.fn()}
            updateNote={jest.fn()}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="events"]')
          .first()
          .exists()
      ).toEqual(true);
    });

    test('it renders a tooltip for timestamp', async () => {
      const headersJustTimestamp = defaultHeaders.filter(h => h.id === '@timestamp');

      const wrapper = mount(
        <TestProviders>
          <Body
            addNoteToEvent={jest.fn()}
            browserFields={mockBrowserFields}
            columnHeaders={headersJustTimestamp}
            columnRenderers={columnRenderers}
            data={mockTimelineData}
            eventIdToNoteIds={{}}
            height={testBodyHeight}
            id={'timeline-test'}
            getNotesByIds={mockGetNotesByIds}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            onFilterChange={jest.fn()}
            onPinEvent={jest.fn()}
            onUnPinEvent={jest.fn()}
            onUpdateColumns={jest.fn()}
            pinnedEventIds={{}}
            range={'1 Day'}
            rowRenderers={rowRenderers}
            sort={mockSort}
            toggleColumn={jest.fn()}
            updateNote={jest.fn()}
          />
        </TestProviders>
      );
      wrapper.update();
      await wait();
      wrapper.update();
      headersJustTimestamp.forEach(() => {
        expect(
          wrapper
            .find('[data-test-subj="data-driven-columns"]')
            .first()
            .find('[data-test-subj="localized-date-tool-tip"]')
            .exists()
        ).toEqual(true);
      });
    });
  });
});
