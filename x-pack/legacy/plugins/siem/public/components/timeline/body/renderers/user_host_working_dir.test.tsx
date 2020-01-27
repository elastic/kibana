/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { TestProviders } from '../../../../mock';
import { UserHostWorkingDir } from './user_host_working_dir';
import { useMountAppended } from '../../../../utils/use_mount_appended';

describe('UserHostWorkingDir', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders against shallow snapshot', () => {
      const wrapper = shallow(
        <UserHostWorkingDir
          contextId="context-123"
          eventId="event-123"
          userDomain="[userDomain-123]"
          userName="[userName-123]"
          hostName="[hostName-123]"
          workingDirectory="[working-directory-123]"
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns null if userDomain, userName, hostName, and workingDirectory are all null', () => {
      const wrapper = shallow(
        <UserHostWorkingDir
          contextId="context-123"
          eventId="event-123"
          userDomain={null}
          userName={null}
          hostName={null}
          workingDirectory={null}
        />
      );
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });

    test('it returns null if userDomain, userName, hostName, and workingDirectory are all undefined', () => {
      const wrapper = shallow(
        <UserHostWorkingDir
          contextId="context-123"
          eventId="event-123"
          userDomain={undefined}
          userName={undefined}
          hostName={undefined}
          workingDirectory={undefined}
        />
      );
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });

    test('it returns userDomain if that is the only attribute defined', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain="[user-domain-123]"
              userName={undefined}
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('\\[user-domain-123]');
    });

    test('it returns userName if that is the only attribute defined', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain={undefined}
              userName="[user-name-123]"
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[user-name-123]');
    });

    test('it returns hostName if that is the only attribute defined', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain={undefined}
              userName={null}
              hostName="[host-name-123]"
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[host-name-123]');
    });

    test('it returns "in" + workingDirectory if that is the only attribute defined', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain={null}
              userName={null}
              hostName={null}
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('in[working-directory-123]');
    });

    test('it returns userName and workingDirectory', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain={null}
              userName="[user-name-123]"
              hostName={null}
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[user-name-123]in[working-directory-123]');
    });

    test('it returns hostName and workingDirectory', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain={null}
              userName={null}
              hostName="[host-name-123]"
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[host-name-123]in[working-directory-123]');
    });

    test('it returns userName, userDomain, hostName', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain="[user-domain-123]"
              userName="[user-name-123]"
              hostName="[host-name-123]"
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[user-name-123]\\[user-domain-123]@[host-name-123]');
    });

    test('it returns hostName and userName with the default hostNameSeparator "@", when hostNameSeparator is NOT specified as a prop', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain={null}
              userName="[user-name-123]"
              hostName="[host-name-123]"
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('[user-name-123]@[host-name-123]');
    });

    test('it returns hostName and userName with an overridden hostNameSeparator, when hostNameSeparator is specified as a prop', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              hostNameSeparator="custom separator"
              userDomain={null}
              userName="[user-name-123]"
              hostName="[host-name-123]"
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('[user-name-123]custom separator[host-name-123]');
    });

    test('it renders a draggable `user.domain` field (by default) when userDomain is provided, and userDomainField is NOT specified as a prop', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain="[user-domain-123]"
              userName={undefined}
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-content-user.domain"]').exists()).toBe(true);
    });

    test('it renders a draggable with an overridden field name when userDomain is provided, and userDomainField is also specified as a prop', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain="[user-domain-123]"
              userDomainField="overridden.field.name"
              userName={undefined}
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="draggable-content-overridden.field.name"]').exists()
      ).toBe(true);
    });

    test('it renders a draggable `user.name` field (by default) when userName is provided, and userNameField is NOT specified as a prop', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain={undefined}
              userName="[user-name-123]"
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-content-user.name"]').exists()).toBe(true);
    });

    test('it renders a draggable with an overridden field name when userName is provided, and userNameField is also specified as a prop', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userDomain={undefined}
              userName="[user-name-123]"
              userNameField="overridden.field.name"
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="draggable-content-overridden.field.name"]').exists()
      ).toBe(true);
    });
  });
});
