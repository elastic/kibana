/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../mock';
import '../../mock/ui_settings';

import { EventsViewerHeader } from './events_viewer_header';

jest.mock('../../lib/settings/use_kibana_ui_setting');

const totalCount = 30;

describe('EventsViewerHeader', () => {
  test('it renders the expected title', () => {
    const wrapper = mount(
      <TestProviders>
        <EventsViewerHeader id="test" showInspect={false} totalCount={totalCount} />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="panel_headline_title"]')
        .first()
        .text()
    ).toEqual('Events');
  });

  test('it renders a transparent inspect button when showInspect is false', () => {
    const wrapper = mount(
      <TestProviders>
        <EventsViewerHeader id="test" showInspect={false} totalCount={totalCount} />
      </TestProviders>
    );

    expect(
      wrapper
        .find(`[data-test-subj="transparent-inspect-container"]`)
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders an opaque inspect button when showInspect is true', () => {
    const wrapper = mount(
      <TestProviders>
        <EventsViewerHeader id="test" showInspect={true} totalCount={totalCount} />
      </TestProviders>
    );

    expect(
      wrapper
        .find(`[data-test-subj="opaque-inspect-container"]`)
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders the expected totalCount', () => {
    const wrapper = mount(
      <TestProviders>
        <EventsViewerHeader id="test" showInspect={false} totalCount={totalCount} />
      </TestProviders>
    );

    expect(
      wrapper
        .find(`[data-test-subj="subtitle"]`)
        .first()
        .text()
    ).toEqual(`Showing: ${totalCount} events`);
  });
});
