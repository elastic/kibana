/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import { TestProviders } from '../../mock';
import { wait } from '../../lib/helpers';
import '../../mock/ui_settings';

import { mockEventViewerResponse } from './mock';
import { StatefulEventsViewer } from '.';

jest.mock('../../lib/settings/use_kibana_ui_setting');

const from = 1566943856794;
const to = 1566857456791;

describe('StatefulEventsViewer', () => {
  test('it renders the events viewer', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockEventViewerResponse} addTypename={false}>
          <StatefulEventsViewer
            end={to}
            id={'test-stateful-events-viewer'}
            kqlQueryExpression={''}
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
            end={to}
            id={'test-stateful-events-viewer'}
            kqlQueryExpression={''}
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
            end={to}
            id={'test-stateful-events-viewer'}
            kqlQueryExpression={''}
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
