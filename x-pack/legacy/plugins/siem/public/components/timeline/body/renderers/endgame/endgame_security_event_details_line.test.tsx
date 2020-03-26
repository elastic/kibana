/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TestProviders } from '../../../../../mock';

import { EndgameSecurityEventDetailsLine } from './endgame_security_event_details_line';
import { useMountAppended } from '../../../../../utils/use_mount_appended';

describe('EndgameSecurityEventDetailsLine', () => {
  const mount = useMountAppended();

  test('it renders the expected text when all properties are provided and event action is admin_logon', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="admin_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'With special privileges,[userName]\\[userDomain]@[hostName]successfully logged inusing logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when all properties are provided and event action is explicit_user_logon', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]\\[endgameTargetDomainName]to[hostName]using logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when endgameLogonType is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={undefined}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]\\[endgameTargetDomainName]to[hostName](target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when endgameSubjectDomainName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName={undefined}
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]\\[endgameTargetDomainName]to[hostName]using logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when endgameSubjectLogonId is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId={undefined}
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]\\[endgameTargetDomainName]to[hostName]using logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName][eventCode]'
    );
  });

  test('it renders the expected text when when endgameSubjectUserName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName={undefined}
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]\\[endgameTargetDomainName]to[hostName]using logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when endgameTargetDomainName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName={undefined}
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]to[hostName]using logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when endgameTargetLogonId is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId={undefined}
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]\\[endgameTargetDomainName]to[hostName]using logon type2 - Interactivevia[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when endgameTargetUserName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName={undefined}
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials\\[endgameTargetDomainName][hostName]using logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when eventAction is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction={undefined}
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]successfully logged inusing logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when eventCode is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode={undefined}
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]\\[endgameTargetDomainName]to[hostName]using logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[winlogEventId]'
    );
  });

  test('it renders the expected text when hostName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName={undefined}
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]\\[endgameTargetDomainName]using logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when processExecutable is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable={undefined}
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]\\[endgameTargetDomainName]to[hostName]using logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when processName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName={undefined}
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]\\[endgameTargetDomainName]to[hostName]using logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processExecutable](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when processPid is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="explicit_user_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={undefined}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentials[endgameTargetUserName]\\[endgameTargetDomainName]to[hostName]using logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName]as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when userDomain is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="admin_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain={undefined}
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'With special privileges,[userName]@[hostName]successfully logged inusing logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when userName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="admin_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName={undefined}
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'With special privileges,\\[userDomain][hostName]successfully logged inusing logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when winlogEventId is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="admin_logon"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'With special privileges,[userName]\\[userDomain]@[hostName]successfully logged inusing logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])[eventCode]'
    );
  });

  test('it renders the expected text when BOTH eventCode and winlogEventId are NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetailsLine
          contextId="test"
          endgameLogonType={2}
          endgameSubjectDomainName="[endgameSubjectDomainName]"
          endgameSubjectLogonId="[endgameSubjectLogonId]"
          endgameSubjectUserName="[endgameSubjectUserName]"
          endgameTargetDomainName="[endgameTargetDomainName]"
          endgameTargetLogonId="[endgameTargetLogonId]"
          endgameTargetUserName="[endgameTargetUserName]"
          eventAction="admin_logon"
          eventCode={undefined}
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'With special privileges,[userName]\\[userDomain]@[hostName]successfully logged inusing logon type2 - Interactive(target logon ID[endgameTargetLogonId])via[processName](123)as requested by subject[endgameSubjectUserName]\\[endgameSubjectDomainName](subject logon ID[endgameSubjectLogonId])'
    );
  });
});
