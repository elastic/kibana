/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { TestProviders } from '../../../../../mock';
import { SessionUserHostWorkingDir } from './session_user_host_working_dir';
import { useMountAppended } from '../../../../../utils/use_mount_appended';

describe('SessionUserHostWorkingDir', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders the default SessionUserHostWorkingDir', () => {
      const wrapper = shallow(
        <EuiFlexItem component="span" grow={false}>
          <SessionUserHostWorkingDir
            contextId="contextid-123"
            eventId="eventid-123"
            hostName="hostname-123"
            primary="primary-123"
            secondary="secondary-123"
            session="session-123"
            userName="username-123"
            workingDirectory="workingdir-123"
          />
        </EuiFlexItem>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders with just eventId and contextId', () => {
      const wrapper = mount(
        <TestProviders>
          <EuiFlexItem component="span" grow={false}>
            <SessionUserHostWorkingDir
              contextId="contextid-123"
              eventId="eventid-123"
              hostName={undefined}
              primary={undefined}
              secondary={undefined}
              session={undefined}
              userName={undefined}
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session');
    });

    test('it renders with only eventId, contextId, session', () => {
      const wrapper = mount(
        <TestProviders>
          <EuiFlexItem component="span" grow={false}>
            <SessionUserHostWorkingDir
              contextId="contextid-123"
              eventId="eventid-123"
              hostName={undefined}
              primary={undefined}
              secondary={undefined}
              session="session-123"
              userName={undefined}
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsession-123');
    });

    test('it renders with only eventId, contextId, session, hostName', () => {
      const wrapper = mount(
        <TestProviders>
          <EuiFlexItem component="span" grow={false}>
            <SessionUserHostWorkingDir
              contextId="contextid-123"
              eventId="eventid-123"
              hostName="hostname-123"
              primary={undefined}
              secondary={undefined}
              session="session-123"
              userName={undefined}
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsession-123@hostname-123');
    });

    test('it renders with only eventId, contextId, session, hostName, userName', () => {
      const wrapper = mount(
        <TestProviders>
          <EuiFlexItem component="span" grow={false}>
            <SessionUserHostWorkingDir
              contextId="contextid-123"
              eventId="eventid-123"
              hostName="hostname-123"
              primary={undefined}
              secondary={undefined}
              session="session-123"
              userName="username-123"
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsession-123username-123@hostname-123');
    });

    test('it renders with only eventId, contextId, session, hostName, userName, primary', () => {
      const wrapper = mount(
        <TestProviders>
          <EuiFlexItem component="span" grow={false}>
            <SessionUserHostWorkingDir
              contextId="contextid-123"
              eventId="eventid-123"
              hostName="hostname-123"
              primary="primary-123"
              secondary={undefined}
              session="session-123"
              userName="username-123"
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsession-123primary-123@hostname-123');
    });

    test('it renders with only eventId, contextId, session, hostName, userName, primary, secondary', () => {
      const wrapper = mount(
        <TestProviders>
          <EuiFlexItem component="span" grow={false}>
            <SessionUserHostWorkingDir
              contextId="contextid-123"
              eventId="eventid-123"
              hostName="hostname-123"
              primary="primary-123"
              secondary="secondary-123"
              session="session-123"
              userName="username-123"
              workingDirectory={undefined}
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsession-123primary-123assecondary-123@hostname-123');
    });

    test('it renders with everything as expected', () => {
      const wrapper = mount(
        <TestProviders>
          <EuiFlexItem component="span" grow={false}>
            <SessionUserHostWorkingDir
              contextId="contextid-123"
              eventId="eventid-123"
              hostName="hostname-123"
              primary="primary-123"
              secondary="secondary-123"
              session="session-123"
              userName="username-123"
              workingDirectory="workingdirectory-123"
            />
          </EuiFlexItem>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-123primary-123assecondary-123@hostname-123inworkingdirectory-123'
      );
    });
  });
});
