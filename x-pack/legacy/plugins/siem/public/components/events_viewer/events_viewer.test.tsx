/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';
import useResizeObserver from 'use-resize-observer';

import { mockIndexPattern, TestProviders } from '../../mock';
import { wait } from '../../lib/helpers';

import { mockEventViewerResponse } from './mock';
import { StatefulEventsViewer } from '.';
import { defaultHeaders } from './default_headers';
import { useFetchIndexPatterns } from '../../containers/detection_engine/rules/fetch_index_patterns';
import { mockBrowserFields } from '../../containers/source/mock';
import { eventsDefaultModel } from './default_model';
import { useMountAppended } from '../../utils/use_mount_appended';

const mockUseFetchIndexPatterns: jest.Mock = useFetchIndexPatterns as jest.Mock;
jest.mock('../../containers/detection_engine/rules/fetch_index_patterns');
mockUseFetchIndexPatterns.mockImplementation(() => [
  {
    browserFields: mockBrowserFields,
    indexPatterns: mockIndexPattern,
  },
]);

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer');
mockUseResizeObserver.mockImplementation(() => ({}));

const from = 1566943856794;
const to = 1566857456791;

describe('EventsViewer', () => {
  const mount = useMountAppended();

  test('it renders the "Showing..." subtitle with the expected event count', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
          <StatefulEventsViewer
            defaultModel={eventsDefaultModel}
            end={to}
            id={'test-stateful-events-viewer'}
            start={from}
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();
    wrapper.update();

    expect(
      wrapper
        .find(`[data-test-subj="header-section-subtitle"]`)
        .first()
        .text()
    ).toEqual('Showing: 12 events');
  });

  test('it renders the Fields Browser as a settings gear', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
          <StatefulEventsViewer
            defaultModel={eventsDefaultModel}
            end={to}
            id={'test-stateful-events-viewer'}
            start={from}
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();
    wrapper.update();

    expect(
      wrapper
        .find(`[data-test-subj="show-field-browser-gear"]`)
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the footer containing the Load More button', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
          <StatefulEventsViewer
            defaultModel={eventsDefaultModel}
            end={to}
            id={'test-stateful-events-viewer'}
            start={from}
          />
        </MockedProvider>
      </TestProviders>
    );

    await wait();
    wrapper.update();

    expect(
      wrapper
        .find(`[data-test-subj="TimelineMoreButton"]`)
        .first()
        .exists()
    ).toBe(true);
  });

  defaultHeaders.forEach(header => {
    test(`it renders the ${header.id} default EventsViewer column header`, async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
            <StatefulEventsViewer
              defaultModel={eventsDefaultModel}
              end={to}
              id={'test-stateful-events-viewer'}
              start={from}
            />
          </MockedProvider>
        </TestProviders>
      );

      await wait();
      wrapper.update();

      defaultHeaders.forEach(h =>
        expect(
          wrapper
            .find(`[data-test-subj="header-text-${header.id}"]`)
            .first()
            .exists()
        ).toBe(true)
      );
    });
  });
});
