/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { mockTimelineData, TestProviders } from '../../../../mock';
import { useMountAppended } from '../../../../utils/use_mount_appended';
import { HostWorkingDir } from './host_working_dir';

describe('HostWorkingDir', () => {
  const mount = useMountAppended();

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <HostWorkingDir
        contextId="test"
        eventId={mockTimelineData[0].ecs._id}
        hostName="[hostname-123]"
        workingDirectory="[working-directory-123]"
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders a hostname without a workingDirectory', () => {
    const wrapper = mount(
      <TestProviders>
        <div>
          <HostWorkingDir
            contextId="test"
            eventId={mockTimelineData[0].ecs._id}
            hostName="[hostname-123]"
            workingDirectory={undefined}
          />
        </div>
      </TestProviders>
    );

    expect(wrapper.text()).toEqual('[hostname-123]');
  });

  test('it renders a hostname with a workingDirectory set to null', () => {
    const wrapper = mount(
      <TestProviders>
        <div>
          <HostWorkingDir
            contextId="test"
            eventId={mockTimelineData[0].ecs._id}
            hostName="[hostname-123]"
            workingDirectory={null}
          />
        </div>
      </TestProviders>
    );

    expect(wrapper.text()).toEqual('[hostname-123]');
  });

  test('it renders a a workingDirectory without a hostname with words "in" at the beginning', () => {
    const wrapper = mount(
      <TestProviders>
        <div>
          <HostWorkingDir
            contextId="test"
            eventId={mockTimelineData[0].ecs._id}
            hostName={undefined}
            workingDirectory="[working-directory-123]"
          />
        </div>
      </TestProviders>
    );

    expect(wrapper.text()).toEqual('in[working-directory-123]');
  });

  test('it renders a a workingDirectory with hostname set to null with words "in" at the beginning', () => {
    const wrapper = mount(
      <TestProviders>
        <div>
          <HostWorkingDir
            contextId="test"
            eventId={mockTimelineData[0].ecs._id}
            hostName={null}
            workingDirectory="[working-directory-123]"
          />
        </div>
      </TestProviders>
    );

    expect(wrapper.text()).toEqual('in[working-directory-123]');
  });
});
