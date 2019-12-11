/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import { wait } from '../../lib/helpers';
import { mockIndexPattern, TestProviders } from '../../mock';
import { useMountAppended } from '../../utils/use_mount_appended';
import { mockUseKibanaCore } from '../../mock/kibana_core';

import { mockEventViewerResponse } from './mock';
import { StatefulEventsViewer } from '.';
import { useFetchIndexPatterns } from '../../containers/detection_engine/rules/fetch_index_patterns';
import { mockBrowserFields } from '../../containers/source/mock';
import { eventsDefaultModel } from './default_model';

jest.mock('../../lib/settings/use_kibana_ui_setting');

jest.mock('../../lib/compose/kibana_core', () => ({
  useKibanaCore: () => mockUseKibanaCore(),
}));

const mockUseFetchIndexPatterns: jest.Mock = useFetchIndexPatterns as jest.Mock;
jest.mock('../../containers/detection_engine/rules/fetch_index_patterns');
mockUseFetchIndexPatterns.mockImplementation(() => [
  {
    browserFields: mockBrowserFields,
    indexPatterns: mockIndexPattern,
  },
]);

const from = 1566943856794;
const to = 1566857456791;

describe('StatefulEventsViewer', () => {
  const mount = useMountAppended();

  test('it renders the events viewer', async () => {
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
        .find('[data-test-subj="events-viewer-panel"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders a transparent inspect button when it does NOT have mouse focus', async () => {
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
        .find(`[data-test-subj="transparent-inspect-container"]`)
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders an opaque inspect button when it has mouse focus', async () => {
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

    wrapper.simulate('mouseenter');
    wrapper.update();

    expect(
      wrapper
        .find(`[data-test-subj="opaque-inspect-container"]`)
        .first()
        .exists()
    ).toBe(true);
  });
});
