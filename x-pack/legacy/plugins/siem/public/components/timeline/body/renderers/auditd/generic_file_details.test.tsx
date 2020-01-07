/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { BrowserFields } from '../../../../../containers/source';
import { mockBrowserFields } from '../../../../../containers/source/mock';
import { mockTimelineData, TestProviders } from '../../../../../mock';
import { AuditdGenericFileDetails, AuditdGenericFileLine } from './generic_file_details';
import { useMountAppended } from '../../../../../utils/use_mount_appended';

describe('GenericFileDetails', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders the default GenericFileDetails', () => {
      // I cannot and do not want to use BrowserFields for the mocks for the snapshot tests as they are too heavy
      const browserFields: BrowserFields = {};
      const wrapper = shallow(
        <AuditdGenericFileDetails
          browserFields={browserFields}
          contextId="contextid-123"
          data={mockTimelineData[27].ecs}
          fileIcon="document"
          text="generic-text-123"
          timelineId="test"
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns auditd if the data does contain auditd data', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileDetails
            browserFields={mockBrowserFields}
            contextId="contextid-123"
            data={mockTimelineData[19].ecs}
            fileIcon="document"
            text="generic-text-123"
            timelineId="test"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionalice@zeek-sanfranin/generic-text-123usinggpgconf(5402)gpgconf--list-dirsagent-socketgpgconf --list-dirs agent-socket'
      );
    });

    test('it returns null for text if the data contains no auditd data', () => {
      const wrapper = shallow(
        <AuditdGenericFileDetails
          browserFields={mockBrowserFields}
          contextId="contextid-123"
          data={mockTimelineData[0].ecs}
          fileIcon="document"
          text="generic-text-123"
          timelineId="test"
        />
      );
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });
  });

  describe('#AuditdGenericFileLine', () => {
    test('it returns pretty output if you send in all your happy path data', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={['arg1', 'arg2', 'arg3']}
            contextId="contextid-123"
            fileIcon="document"
            filePath="/somepath"
            hostName="host-1"
            id="hello-i-am-an-id"
            primary="username-1"
            processExecutable="process-1"
            processName="process-name-1"
            processPid={123}
            processTitle="process-title-1"
            result="success"
            secondary="username-1"
            session="session-1"
            text="generic-text-123"
            userName="username-1"
            workingDirectory="working-directory-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1generic-text-123/somepathusingprocess-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with username if username, primary, and secondary all equal each other ', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={['arg1', 'arg2', 'arg3']}
            contextId="contextid-123"
            fileIcon="document"
            filePath="/somepath"
            hostName="host-1"
            id="hello-i-am-an-id"
            primary="username-1"
            processExecutable="process-1"
            processName="process-name-1"
            processPid={123}
            processTitle="process-title-1"
            result="success"
            secondary="username-1"
            session="session-1"
            text="generic-text-123"
            userName="username-1"
            workingDirectory="working-directory-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1generic-text-123/somepathusingprocess-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with username if primary and secondary equal unset', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={['arg1', 'arg2', 'arg3']}
            contextId="contextid-123"
            fileIcon="document"
            filePath="/somepath"
            hostName="host-1"
            id="hello-i-am-an-id"
            primary="unset"
            processExecutable="process-1"
            processName="process-name-1"
            processPid={123}
            processTitle="process-title-1"
            result="success"
            secondary="unset"
            session="session-1"
            text="generic-text-123"
            userName="username-1"
            workingDirectory="working-directory-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1generic-text-123/somepathusingprocess-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with username if primary and secondary equal unset with different casing', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={['arg1', 'arg2', 'arg3']}
            contextId="contextid-123"
            fileIcon="document"
            filePath="/somepath"
            hostName="host-1"
            id="hello-i-am-an-id"
            primary="Unset"
            processExecutable="process-1"
            processName="process-name-1"
            processPid={123}
            processTitle="process-title-1"
            result="success"
            secondary="uNseT"
            session="session-1"
            text="generic-text-123"
            userName="username-1"
            workingDirectory="working-directory-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1generic-text-123/somepathusingprocess-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with username if primary and secondary are undefined', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={['arg1', 'arg2', 'arg3']}
            contextId="contextid-123"
            fileIcon="document"
            filePath="/somepath"
            hostName="host-1"
            id="hello-i-am-an-id"
            primary={undefined}
            processExecutable="process-1"
            processName="process-name-1"
            processPid={123}
            processTitle="process-title-1"
            result="success"
            secondary={undefined}
            session="session-1"
            text="generic-text-123"
            userName="username-1"
            workingDirectory="working-directory-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1generic-text-123/somepathusingprocess-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with "as" wording if username, primary, and secondary are all different', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={['arg1', 'arg2', 'arg3']}
            contextId="contextid-123"
            fileIcon="document"
            filePath="/somepath"
            hostName="host-1"
            id="hello-i-am-an-id"
            primary="[username-2]"
            processExecutable="process-1"
            processName="process-name-1"
            processPid={123}
            processTitle="process-title-1"
            result="success"
            secondary="[username-3]"
            session="session-1"
            text="generic-text-123"
            userName="[username-1]"
            workingDirectory="working-directory-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-2]as[username-3]@host-1inworking-directory-1generic-text-123/somepathusingprocess-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with "as" wording if username and primary are the same but secondary is different', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={['arg1', 'arg2', 'arg3']}
            contextId="contextid-123"
            fileIcon="document"
            filePath="/somepath"
            hostName="host-1"
            id="hello-i-am-an-id"
            primary="[username-1]"
            processExecutable="process-1"
            processName="process-name-1"
            processPid={123}
            processTitle="process-title-1"
            result="success"
            secondary="[username-2]"
            session="session-1"
            text="generic-text-123"
            userName="[username-1]"
            workingDirectory="working-directory-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-1]as[username-2]@host-1inworking-directory-1generic-text-123/somepathusingprocess-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with primary if username and secondary are unset with different casing', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={['arg1', 'arg2', 'arg3']}
            contextId="contextid-123"
            fileIcon="document"
            filePath="/somepath"
            hostName="host-1"
            id="hello-i-am-an-id"
            primary="[username-primary]"
            processExecutable="process-1"
            processName="process-name-1"
            processPid={123}
            processTitle="process-title-1"
            result="success"
            secondary="unset"
            session="session-1"
            text="generic-text-123"
            userName="unseT"
            workingDirectory="working-directory-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-primary]@host-1inworking-directory-1generic-text-123/somepathusingprocess-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with primary if username and secondary are undefined', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={['arg1', 'arg2', 'arg3']}
            contextId="contextid-123"
            fileIcon="document"
            filePath="/somepath"
            hostName="host-1"
            id="hello-i-am-an-id"
            primary="[username-primary]"
            processExecutable="process-1"
            processName="process-name-1"
            processPid={123}
            processTitle="process-title-1"
            result="success"
            secondary={undefined}
            session="session-1"
            text="generic-text-123"
            userName={undefined}
            workingDirectory="working-directory-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-primary]@host-1inworking-directory-1generic-text-123/somepathusingprocess-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns just session if only session id is given', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={undefined}
            contextId="contextid-123"
            fileIcon="document"
            filePath={undefined}
            hostName={undefined}
            id="hello-i-am-an-id"
            primary={undefined}
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
            processTitle={undefined}
            result={undefined}
            secondary={undefined}
            session={undefined}
            text="generic-text-123"
            userName={undefined}
            workingDirectory={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session');
    });

    test('it returns only session and hostName if only hostname and an id is given', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={undefined}
            contextId="contextid-123"
            fileIcon="document"
            filePath={undefined}
            hostName="some-host-name"
            id="hello-i-am-an-id"
            primary={undefined}
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
            processTitle={undefined}
            result={undefined}
            secondary={undefined}
            session={undefined}
            text="generic-text-123"
            userName={undefined}
            workingDirectory={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session@some-host-name');
    });

    test('it returns only a session and user name if only a user name and id is given', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={undefined}
            contextId="contextid-123"
            fileIcon="document"
            filePath={undefined}
            hostName={undefined}
            id="hello-i-am-an-id"
            primary={undefined}
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
            processTitle={undefined}
            result={undefined}
            secondary={undefined}
            session={undefined}
            text="generic-text-123"
            userName="some-user-name"
            workingDirectory={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsome-user-name');
    });

    test('it returns only a process name if only given a process name and id', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={undefined}
            contextId="contextid-123"
            fileIcon="document"
            filePath={undefined}
            hostName={undefined}
            id="hello-i-am-an-id"
            primary={undefined}
            processExecutable="some-process-name"
            processName={undefined}
            processPid={undefined}
            processTitle={undefined}
            result={undefined}
            secondary={undefined}
            session={undefined}
            text="generic-text-123"
            userName={undefined}
            workingDirectory={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessiongeneric-text-123usingsome-process-name');
    });

    test('it returns session user name and title if process title with id is given', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={undefined}
            contextId="contextid-123"
            fileIcon="document"
            filePath={undefined}
            hostName={undefined}
            id="hello-i-am-an-id"
            primary={undefined}
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
            processTitle="some-process-title"
            result={undefined}
            secondary={undefined}
            session={undefined}
            text="generic-text-123"
            userName="some-user-name"
            workingDirectory={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsome-user-namesome-process-title');
    });

    test('it returns only a working directory if that is all that is given with a id', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={undefined}
            contextId="contextid-123"
            fileIcon="document"
            filePath={undefined}
            hostName={undefined}
            id="hello-i-am-an-id"
            primary={undefined}
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
            processTitle={undefined}
            result={undefined}
            secondary={undefined}
            session={undefined}
            text="generic-text-123"
            userName={undefined}
            workingDirectory="some-working-directory"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessioninsome-working-directory');
    });

    test('it returns only the session and args with id if that is all that is given (very unlikely situation)', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericFileLine
            args={['arg1', 'arg2', 'arg 3']}
            contextId="contextid-123"
            fileIcon="document"
            filePath={undefined}
            hostName={undefined}
            id="hello-i-am-an-id"
            primary={undefined}
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
            processTitle={undefined}
            result={undefined}
            secondary={undefined}
            session={undefined}
            text="generic-text-123"
            userName={undefined}
            workingDirectory={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionarg1arg2arg 3');
    });
  });
});
