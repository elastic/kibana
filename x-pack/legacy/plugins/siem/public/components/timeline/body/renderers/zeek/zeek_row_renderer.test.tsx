/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { mockBrowserFields } from '../../../../../containers/source/mock';
import { Ecs } from '../../../../../graphql/types';
import { mockTimelineData, TestProviders } from '../../../../../mock';
import { useMountAppended } from '../../../../../utils/use_mount_appended';
import { zeekRowRenderer } from './zeek_row_renderer';

describe('zeek_row_renderer', () => {
  const mount = useMountAppended();
  let nonZeek: Ecs;
  let zeek: Ecs;

  beforeEach(() => {
    nonZeek = cloneDeep(mockTimelineData[0].ecs);
    zeek = cloneDeep(mockTimelineData[13].ecs);
  });

  test('renders correctly against snapshot', () => {
    const children = zeekRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: nonZeek,
      children: <span>{'some children'}</span>,
      timelineId: 'test',
    });

    const wrapper = shallow(<span>{children}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should return false if not a zeek datum', () => {
    expect(zeekRowRenderer.isInstance(nonZeek)).toBe(false);
  });

  test('should return true if it is a suricata datum', () => {
    expect(zeekRowRenderer.isInstance(zeek)).toBe(true);
  });

  test('should render children normally if it does not have a zeek object', () => {
    const children = zeekRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: nonZeek,
      children: <span>{'some children'}</span>,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('some children');
  });

  test('should render a zeek row', () => {
    const children = zeekRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: zeek,
      children: <span>{'some children '}</span>,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      'some children C8DRTq362Fios6hw16connectionREJSrConnection attempt rejectedtcpSource185.176.26.101:44059Destination207.154.238.205:11568'
    );
  });
});
