/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { BrowserFields } from '../../../../../containers/source';
import { mockBrowserFields } from '../../../../../containers/source/mock';
import { mockTimelineData, TestProviders } from '../../../../../mock';
import { SystemGenericFileDetails, SystemGenericFileLine } from './generic_file_details';
import { useMountAppended } from '../../../../../utils/use_mount_appended';

describe('SystemGenericFileDetails', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders the default SystemGenericDetails', () => {
      // I cannot and do not want to use BrowserFields for the mocks for the snapshot tests as they are too heavy
      const browserFields: BrowserFields = {};
      const wrapper = shallow(
        <SystemGenericFileDetails
          contextId="[contextid-123]"
          text="[generic-text-123]"
          browserFields={browserFields}
          data={mockTimelineData[29].ecs}
          timelineId="test"
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it returns system rendering if the data does contain system data', () => {
      const wrapper = mount(
        <TestProviders>
          <SystemGenericFileDetails
            contextId="[contextid-123]"
            text="[generic-text-123]"
            browserFields={mockBrowserFields}
            data={mockTimelineData[29].ecs}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Evan@zeek-london[generic-text-123](6278)with resultfailureSource128.199.212.120'
      );
    });
  });

  describe('#SystemGenericFileLine', () => {
    test('it returns pretty output if you send in all your happy path data', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              id="[id-123]"
              contextId="[context-123]"
              endgameExitCode="[endgameExitCode-123]"
              endgameFileName="[endgameFileName-123]"
              endgameFilePath="[endgameFilePath-123]"
              endgameParentProcessName="[endgameParentProcessName-123]"
              endgamePid={789}
              endgameProcessName="[endgameProcessName-123]"
              eventAction="[eventAction-123]"
              fileName="[fileName-123]"
              filePath="[filePath-123]"
              hostName="[hostname-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              processTitle="[some-title-123]"
              args={['[arg-1]', '[arg-2]', '[arg-3]']}
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageExecutable=123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={123}
              processPpid={456}
              processName="[processName-123]"
              showMessage={true}
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text="[generic-text-123]"
              userDomain="[userDomain-123]"
              userName="[username-123]"
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[username-123]\\[userDomain-123]@[hostname-123]in[working-directory-123][generic-text-123][fileName-123]in[filePath-123][processName-123](123)[arg-1][arg-2][arg-3][some-title-123]with exit code[endgameExitCode-123]via parent process[endgameParentProcessName-123](456)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it returns nothing if data is all null', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName={null}
              id="[id-123]"
              message={null}
              outcome={null}
              packageName={null}
              packageSummary={null}
              packageVersion={null}
              processExecutable={null}
              processHashMd5={null}
              processHashSha1={null}
              processHashSha256={null}
              processPid={null}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              processTitle={null}
              args={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('an unknown process');
    });

    test('it can return only the host name', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message={null}
              outcome={null}
              packageName={null}
              packageSummary={null}
              packageVersion={null}
              processExecutable={null}
              processHashMd5={null}
              processHashSha1={null}
              processHashSha256={null}
              processPid={null}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[hostname-123]an unknown process');
    });

    test('it can return the host, message', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome={null}
              packageName={null}
              packageSummary={null}
              packageVersion={null}
              processExecutable={null}
              processHashMd5={null}
              processHashSha1={null}
              processHashSha256={null}
              processPid={null}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[hostname-123]an unknown process[message-123]');
    });

    test('it can return the host, message, outcome', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName={null}
              packageSummary={null}
              packageVersion={null}
              processExecutable={null}
              processHashMd5={null}
              processHashSha1={null}
              processHashSha256={null}
              processPid={null}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123]an unknown processwith result[outcome-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary={null}
              packageVersion={null}
              processExecutable={null}
              processHashMd5={null}
              processHashSha1={null}
              processHashSha256={null}
              processPid={null}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123]an unknown processwith result[outcome-123][packageName-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion={null}
              processExecutable={null}
              processHashMd5={null}
              processHashSha1={null}
              processHashSha256={null}
              processPid={null}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123]an unknown processwith result[outcome-123][packageName-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable={null}
              processHashMd5={null}
              processHashSha1={null}
              processHashSha256={null}
              processPid={null}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123]an unknown processwith result[outcome-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5={null}
              processHashSha1={null}
              processHashSha256={null}
              processPid={null}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][packageVersion-123]with result[outcome-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1={null}
              processHashSha256={null}
              processPid={null}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][packageVersion-123]with result[outcome-123][packageName-123][packageVersion-123][packageSummary-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256={null}
              processPid={null}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][packageVersion-123]with result[outcome-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1, processHashSha256', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={null}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][packageVersion-123]with result[outcome-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1, processHashSha256, processPid', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[processExecutable-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={123}
              processPpid={null}
              processName={null}
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][processExecutable-123](123)with result[outcome-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1, processHashSha256, processPid, processPpid, processName', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={null}
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName={null}
              endgamePid={null}
              endgameProcessName={null}
              eventAction={null}
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={123}
              processPpid={456}
              processName="[processName-123]"
              showMessage={true}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][processName-123](123)via parent process(456)with result[outcome-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the endgameExitCode, endgameParentProcessName, eventAction, host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1, processHashSha256, processPid, processPpid, processName, sshMethod', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode="[endgameExitCode-123]"
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName="[endgameParentProcessName-123]"
              endgamePid={null}
              endgameProcessName={null}
              eventAction="[eventAction-123]"
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={123}
              processPpid={456}
              processName="[processName-123]"
              showMessage={true}
              sshMethod="[sshMethod-123]"
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][processName-123](123)with exit code[endgameExitCode-123]via parent process[endgameParentProcessName-123](456)with result[outcome-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the endgameExitCode, endgameParentProcessName, eventAction, host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1, processHashSha256, processPid, processPpid, processName, sshMethod, sshSignature', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode="[endgameExitCode-123]"
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName="[endgameParentProcessName-123]"
              endgamePid={null}
              endgameProcessName={null}
              eventAction="[eventAction-123]"
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={123}
              processPpid={456}
              processName="[processName-123]"
              showMessage={true}
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][processName-123](123)with exit code[endgameExitCode-123]via parent process[endgameParentProcessName-123](456)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the endgameExitCode, endgameParentProcessName, eventAction, host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1, processHashSha256, processPid, processPpid, processName, sshMethod, sshSignature, text', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode="[endgameExitCode-123]"
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName="[endgameParentProcessName-123]"
              endgamePid={null}
              endgameProcessName={null}
              eventAction="[eventAction-123]"
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={123}
              processPpid={456}
              processName="[processName-123]"
              showMessage={true}
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text="[text-123]"
              userDomain={null}
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][text-123][processName-123](123)with exit code[endgameExitCode-123]via parent process[endgameParentProcessName-123](456)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the endgameExitCode, endgameParentProcessName, eventAction, host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1, processHashSha256, processPid, processPpid, processName, sshMethod, sshSignature, text, userDomain', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode="[endgameExitCode-123]"
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName="[endgameParentProcessName-123]"
              endgamePid={null}
              endgameProcessName={null}
              eventAction="[eventAction-123]"
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={123}
              processPpid={456}
              processName="[processName-123]"
              showMessage={true}
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text="[text-123]"
              userDomain="[userDomain-123]"
              userName={null}
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '\\[userDomain-123][hostname-123][text-123][processName-123](123)with exit code[endgameExitCode-123]via parent process[endgameParentProcessName-123](456)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the endgameExitCode, endgameParentProcessName, eventAction, host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1, processHashSha256, processPid, processPpid, processName, sshMethod, sshSignature, text, userDomain, username', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode="[endgameExitCode-123]"
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName="[endgameParentProcessName-123]"
              endgamePid={null}
              endgameProcessName={null}
              eventAction="[eventAction-123]"
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={123}
              processPpid={456}
              processName="[processName-123]"
              showMessage={true}
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text="[text-123]"
              userDomain="[userDomain-123]"
              userName="[username-123]"
              workingDirectory={null}
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[username-123]\\[userDomain-123]@[hostname-123][text-123][processName-123](123)with exit code[endgameExitCode-123]via parent process[endgameParentProcessName-123](456)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the endgameExitCode, endgameParentProcessName, eventAction, host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1, processHashSha256, processPid, processPpid, processName, sshMethod, sshSignature, text, userDomain, username, working-directory', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode="[endgameExitCode-123]"
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName="[endgameParentProcessName-123]"
              endgamePid={null}
              endgameProcessName={null}
              eventAction="[eventAction-123]"
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={123}
              processPpid={456}
              processName="[processName-123]"
              showMessage={true}
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text="[text-123]"
              userDomain="[userDomain-123]"
              userName="[username-123]"
              workingDirectory="[working-directory-123]"
              processTitle={null}
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[username-123]\\[userDomain-123]@[hostname-123]in[working-directory-123][text-123][processName-123](123)with exit code[endgameExitCode-123]via parent process[endgameParentProcessName-123](456)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the endgameExitCode, endgameParentProcessName, eventAction, host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1, processHashSha256, processPid, processPpid, processName, sshMethod, sshSignature, text, userDomain, username, working-directory, process-title', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode="[endgameExitCode-123]"
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName="[endgameParentProcessName-123]"
              endgamePid={null}
              endgameProcessName={null}
              eventAction="[eventAction-123]"
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={123}
              processPpid={456}
              processName="[processName-123]"
              showMessage={true}
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text="[text-123]"
              userDomain="[userDomain-123]"
              userName="[username-123]"
              workingDirectory="[working-directory-123]"
              processTitle="[process-title-123]"
              args={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[username-123]\\[userDomain-123]@[hostname-123]in[working-directory-123][text-123][processName-123](123)[process-title-123]with exit code[endgameExitCode-123]via parent process[endgameParentProcessName-123](456)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it can return the endgameExitCode, endgameParentProcessName, eventAction, host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processHashMd5, processHashSha1, processHashSha256, processPid, processPpid, processName, sshMethod, sshSignature, text, userDomain, username, working-directory, process-title, args', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode="[endgameExitCode-123]"
              endgameFileName={null}
              endgameFilePath={null}
              endgameParentProcessName="[endgameParentProcessName-123]"
              endgamePid={null}
              endgameProcessName={null}
              eventAction="[eventAction-123]"
              fileName={null}
              filePath={null}
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageVersion-123]"
              processHashMd5="[processHashMd5-123]"
              processHashSha1="[processHashSha1-123]"
              processHashSha256="[processHashSha256-123]"
              processPid={123}
              processPpid={456}
              processName="[processName-123]"
              showMessage={true}
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text="[text-123]"
              userDomain="[userDomain-123]"
              userName="[username-123]"
              workingDirectory="[working-directory-123]"
              processTitle="[process-title-123]"
              args={['[arg-1]', '[arg-2]', '[arg-3]']}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[username-123]\\[userDomain-123]@[hostname-123]in[working-directory-123][text-123][processName-123](123)[arg-1][arg-2][arg-3][process-title-123]with exit code[endgameExitCode-123]via parent process[endgameParentProcessName-123](456)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][processHashSha256-123][processHashSha1-123][processHashMd5-123][message-123]'
      );
    });

    test('it renders a FileDraggable when endgameFileName and endgameFilePath are provided, but fileName and filePath are NOT provided', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={undefined}
              endgameFileName="[endgameFileName]"
              endgameFilePath="[endgameFilePath]"
              endgameParentProcessName={undefined}
              endgamePid={undefined}
              endgameProcessName={undefined}
              eventAction={undefined}
              fileName={undefined}
              filePath={undefined}
              hostName={undefined}
              id="[id-123]"
              message={undefined}
              outcome={undefined}
              packageName={undefined}
              packageSummary={undefined}
              packageVersion={undefined}
              processExecutable={undefined}
              processHashMd5={undefined}
              processHashSha1={undefined}
              processHashSha256={undefined}
              processPid={undefined}
              processPpid={undefined}
              processName={undefined}
              showMessage={true}
              sshMethod={undefined}
              processTitle={undefined}
              args={undefined}
              sshSignature={undefined}
              text={undefined}
              userDomain={undefined}
              userName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[endgameFileName]in[endgameFilePath]an unknown process');
    });

    test('it prefers to render fileName and filePath over endgameFileName and endgameFilePath respectfully when all of those fields are provided', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={undefined}
              endgameFileName="[endgameFileName]"
              endgameFilePath="[endgameFilePath]"
              endgameParentProcessName={undefined}
              endgamePid={undefined}
              endgameProcessName={undefined}
              eventAction={undefined}
              fileName="[fileName]"
              filePath="[filePath]"
              hostName={undefined}
              id="[id-123]"
              message={undefined}
              outcome={undefined}
              packageName={undefined}
              packageSummary={undefined}
              packageVersion={undefined}
              processExecutable={undefined}
              processHashMd5={undefined}
              processHashSha1={undefined}
              processHashSha256={undefined}
              processPid={undefined}
              processPpid={undefined}
              processName={undefined}
              showMessage={true}
              sshMethod={undefined}
              processTitle={undefined}
              args={undefined}
              sshSignature={undefined}
              text={undefined}
              userDomain={undefined}
              userName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('[fileName]in[filePath]an unknown process');
    });

    ['file_create_event', 'created', 'file_delete_event', 'deleted'].forEach(eventAction => {
      test(`it renders the text "via" when eventAction is ${eventAction}`, () => {
        const wrapper = mount(
          <TestProviders>
            <div>
              <SystemGenericFileLine
                contextId="[context-123]"
                endgameExitCode={undefined}
                endgameFileName={undefined}
                endgameFilePath={undefined}
                endgameParentProcessName={undefined}
                endgamePid={undefined}
                endgameProcessName={undefined}
                eventAction={eventAction}
                fileName={undefined}
                filePath={undefined}
                hostName={undefined}
                id="[id-123]"
                message={undefined}
                outcome={undefined}
                packageName={undefined}
                packageSummary={undefined}
                packageVersion={undefined}
                processExecutable={undefined}
                processHashMd5={undefined}
                processHashSha1={undefined}
                processHashSha256={undefined}
                processPid={undefined}
                processPpid={undefined}
                processName={undefined}
                showMessage={true}
                sshMethod={undefined}
                processTitle={undefined}
                args={undefined}
                sshSignature={undefined}
                text={undefined}
                userDomain={undefined}
                userName={undefined}
                workingDirectory={undefined}
              />
            </div>
          </TestProviders>
        );

        expect(wrapper.text().includes('via')).toBe(true);
      });
    });

    test('it does NOT render the text "via" when eventAction is not a whitelisted action', () => {
      const eventAction = 'a_non_whitelisted_event_action';

      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={undefined}
              endgameFileName={undefined}
              endgameFilePath={undefined}
              endgameParentProcessName={undefined}
              endgamePid={undefined}
              endgameProcessName={undefined}
              eventAction={eventAction}
              fileName={undefined}
              filePath={undefined}
              hostName={undefined}
              id="[id-123]"
              message={undefined}
              outcome={undefined}
              packageName={undefined}
              packageSummary={undefined}
              packageVersion={undefined}
              processExecutable={undefined}
              processHashMd5={undefined}
              processHashSha1={undefined}
              processHashSha256={undefined}
              processPid={undefined}
              processPpid={undefined}
              processName={undefined}
              showMessage={true}
              sshMethod={undefined}
              processTitle={undefined}
              args={undefined}
              sshSignature={undefined}
              text={undefined}
              userDomain={undefined}
              userName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.text().includes('via')).toBe(false);
    });

    test('it renders a ParentProcessDraggable when eventAction is NOT "process_stopped" and NOT "termination_event"', () => {
      const eventAction = 'something_else';

      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={undefined}
              endgameFileName={undefined}
              endgameFilePath={undefined}
              endgameParentProcessName="[endgameParentProcessName]"
              endgamePid={undefined}
              endgameProcessName={undefined}
              eventAction={eventAction}
              fileName={undefined}
              filePath={undefined}
              hostName={undefined}
              id="[id-123]"
              message={undefined}
              outcome={undefined}
              packageName={undefined}
              packageSummary={undefined}
              packageVersion={undefined}
              processExecutable={undefined}
              processHashMd5={undefined}
              processHashSha1={undefined}
              processHashSha256={undefined}
              processPid={undefined}
              processPpid={456}
              processName={undefined}
              showMessage={true}
              sshMethod={undefined}
              processTitle={undefined}
              args={undefined}
              sshSignature={undefined}
              text={undefined}
              userDomain={undefined}
              userName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'an unknown processvia parent process[endgameParentProcessName](456)'
      );
    });

    test('it does NOT render a ParentProcessDraggable when eventAction is "process_stopped"', () => {
      const eventAction = 'process_stopped';

      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={undefined}
              endgameFileName={undefined}
              endgameFilePath={undefined}
              endgameParentProcessName="[endgameParentProcessName]"
              endgamePid={undefined}
              endgameProcessName={undefined}
              eventAction={eventAction}
              fileName={undefined}
              filePath={undefined}
              hostName={undefined}
              id="[id-123]"
              message={undefined}
              outcome={undefined}
              packageName={undefined}
              packageSummary={undefined}
              packageVersion={undefined}
              processExecutable={undefined}
              processHashMd5={undefined}
              processHashSha1={undefined}
              processHashSha256={undefined}
              processPid={undefined}
              processPpid={456}
              processName={undefined}
              showMessage={true}
              sshMethod={undefined}
              processTitle={undefined}
              args={undefined}
              sshSignature={undefined}
              text={undefined}
              userDomain={undefined}
              userName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('an unknown process');
    });

    test('it does NOT render a ParentProcessDraggable when eventAction is "termination_event"', () => {
      const eventAction = 'termination_event';

      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={undefined}
              endgameFileName={undefined}
              endgameFilePath={undefined}
              endgameParentProcessName="[endgameParentProcessName]"
              endgamePid={undefined}
              endgameProcessName={undefined}
              eventAction={eventAction}
              fileName={undefined}
              filePath={undefined}
              hostName={undefined}
              id="[id-123]"
              message={undefined}
              outcome={undefined}
              packageName={undefined}
              packageSummary={undefined}
              packageVersion={undefined}
              processExecutable={undefined}
              processHashMd5={undefined}
              processHashSha1={undefined}
              processHashSha256={undefined}
              processPid={undefined}
              processPpid={456}
              processName={undefined}
              showMessage={true}
              sshMethod={undefined}
              processTitle={undefined}
              args={undefined}
              sshSignature={undefined}
              text={undefined}
              userDomain={undefined}
              userName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('an unknown process');
    });

    test('it returns renders the message when showMessage is true', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={undefined}
              endgameFileName={undefined}
              endgameFilePath={undefined}
              endgameParentProcessName={undefined}
              endgamePid={undefined}
              endgameProcessName={undefined}
              eventAction={undefined}
              fileName={undefined}
              filePath={undefined}
              hostName={undefined}
              id="[id-123]"
              message="[message]"
              outcome={undefined}
              packageName={undefined}
              packageSummary={undefined}
              packageVersion={undefined}
              processExecutable={undefined}
              processHashMd5={undefined}
              processHashSha1={undefined}
              processHashSha256={undefined}
              processPid={undefined}
              processPpid={undefined}
              processName={undefined}
              showMessage={true}
              sshMethod={undefined}
              processTitle={undefined}
              args={undefined}
              sshSignature={undefined}
              text={undefined}
              userDomain={undefined}
              userName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('an unknown process[message]');
    });

    test('it does NOT render the message when showMessage is false', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={undefined}
              endgameFileName={undefined}
              endgameFilePath={undefined}
              endgameParentProcessName={undefined}
              endgamePid={undefined}
              endgameProcessName={undefined}
              eventAction={undefined}
              fileName={undefined}
              filePath={undefined}
              hostName={undefined}
              id="[id-123]"
              message="[message]"
              outcome={undefined}
              packageName={undefined}
              packageSummary={undefined}
              packageVersion={undefined}
              processExecutable={undefined}
              processHashMd5={undefined}
              processHashSha1={undefined}
              processHashSha256={undefined}
              processPid={undefined}
              processPpid={undefined}
              processName={undefined}
              showMessage={false}
              sshMethod={undefined}
              processTitle={undefined}
              args={undefined}
              sshSignature={undefined}
              text={undefined}
              userDomain={undefined}
              userName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('an unknown process');
    });

    test('it renders a ProcessDraggableWithNonExistentProcess when endgamePid and endgameProcessName are provided, but processPid and processName are NOT provided', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={undefined}
              endgameFileName={undefined}
              endgameFilePath={undefined}
              endgameParentProcessName={undefined}
              endgamePid={789}
              endgameProcessName="[endgameProcessName]"
              eventAction={undefined}
              fileName={undefined}
              filePath={undefined}
              hostName={undefined}
              id="[id-123]"
              message={undefined}
              outcome={undefined}
              packageName={undefined}
              packageSummary={undefined}
              packageVersion={undefined}
              processExecutable={undefined}
              processHashMd5={undefined}
              processHashSha1={undefined}
              processHashSha256={undefined}
              processPid={undefined}
              processPpid={undefined}
              processName={undefined}
              showMessage={true}
              sshMethod={undefined}
              processTitle={undefined}
              args={undefined}
              sshSignature={undefined}
              text={undefined}
              userDomain={undefined}
              userName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('[endgameProcessName](789)');
    });

    test('it prefers to render processName and processPid over endgameProcessName and endgamePid respectfully when all of those fields are provided', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericFileLine
              contextId="[context-123]"
              endgameExitCode={undefined}
              endgameFileName={undefined}
              endgameFilePath={undefined}
              endgameParentProcessName={undefined}
              endgamePid={789}
              endgameProcessName="[endgameProcessName]"
              eventAction={undefined}
              fileName={undefined}
              filePath={undefined}
              hostName={undefined}
              id="[id-123]"
              message={undefined}
              outcome={undefined}
              packageName={undefined}
              packageSummary={undefined}
              packageVersion={undefined}
              processExecutable={undefined}
              processHashMd5={undefined}
              processHashSha1={undefined}
              processHashSha256={undefined}
              processPid={123}
              processPpid={undefined}
              processName="[processName]"
              showMessage={true}
              sshMethod={undefined}
              processTitle={undefined}
              args={undefined}
              sshSignature={undefined}
              text={undefined}
              userDomain={undefined}
              userName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('[processName](123)');
    });
  });
});
