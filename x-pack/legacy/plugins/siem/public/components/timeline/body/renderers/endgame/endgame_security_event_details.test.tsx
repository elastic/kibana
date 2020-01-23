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
import { mockBrowserFields } from '../../../../../../public/containers/source/mock';
import {
  mockEndgameAdminLogon,
  mockEndgameExplicitUserLogon,
  mockEndgameUserLogon,
  mockEndgameUserLogoff,
} from '../../../../../../public/mock/mock_endgame_ecs_data';
import { useMountAppended } from '../../../../../utils/use_mount_appended';

import { EndgameSecurityEventDetails } from './endgame_security_event_details';

describe('EndgameSecurityEventDetails', () => {
  const mount = useMountAppended();

  test('it renders the expected text given an Endgame Security user_logon event', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetails
          browserFields={mockBrowserFields}
          contextId="test-context"
          data={mockEndgameUserLogon}
          timelineId="timeline-id-test"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'SYSTEM\\NT AUTHORITY@HD-v1s-d2118419successfully logged inusing logon type5 - Service(target logon ID0x3e7)viaC:\\Windows\\System32\\services.exe(432)as requested by subjectWIN-Q3DOP1UKA81$(subject logon ID0x3e7)4624'
    );
  });

  test('it renders the expected text given an Endgame Security admin_logon event', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetails
          browserFields={mockBrowserFields}
          contextId="test-context"
          data={mockEndgameAdminLogon}
          timelineId="timeline-id-test"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'With special privileges,SYSTEM\\NT AUTHORITY@HD-obe-8bf77f54successfully logged inviaC:\\Windows\\System32\\lsass.exe(964)as requested by subjectSYSTEM\\NT AUTHORITY4672'
    );
  });

  test('it renders the expected text given an Endgame Security explicit_user_logon event', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetails
          browserFields={mockBrowserFields}
          contextId="test-context"
          data={mockEndgameExplicitUserLogon}
          timelineId="timeline-id-test"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'A login was attempted using explicit credentialsArun\\Anvi-AcertoHD-55b-3ec87f66viaC:\\Windows\\System32\\svchost.exe(1736)as requested by subjectANVI-ACER$\\WORKGROUP(subject logon ID0x3e7)4648'
    );
  });

  test('it renders the expected text given an Endgame Security user_logoff event', () => {
    const wrapper = mount(
      <TestProviders>
        <EndgameSecurityEventDetails
          browserFields={mockBrowserFields}
          contextId="test-context"
          data={mockEndgameUserLogoff}
          timelineId="timeline-id-test"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      'Arun\\Anvi-Acer@HD-55b-3ec87f66logged offusing logon type2 - Interactive(target logon ID0x16db41e)viaC:\\Windows\\System32\\lsass.exe(964)4634'
    );
  });
});
