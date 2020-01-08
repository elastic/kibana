/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { BrowserFields } from '../../../../../containers/source';
import { mockBrowserFields } from '../../../../../containers/source/mock';
import { Ecs } from '../../../../../graphql/types';
import {
  mockDnsEvent,
  mockFimFileCreatedEvent,
  mockFimFileDeletedEvent,
  mockSocketClosedEvent,
  mockSocketOpenedEvent,
  mockTimelineData,
  TestProviders,
} from '../../../../../mock';
import {
  mockEndgameAdminLogon,
  mockEndgameCreationEvent,
  mockEndgameDnsRequest,
  mockEndgameExplicitUserLogon,
  mockEndgameFileCreateEvent,
  mockEndgameFileDeleteEvent,
  mockEndgameIpv4ConnectionAcceptEvent,
  mockEndgameIpv6ConnectionAcceptEvent,
  mockEndgameIpv4DisconnectReceivedEvent,
  mockEndgameIpv6DisconnectReceivedEvent,
  mockEndgameTerminationEvent,
  mockEndgameUserLogoff,
  mockEndgameUserLogon,
} from '../../../../../mock/mock_endgame_ecs_data';
import { useMountAppended } from '../../../../../utils/use_mount_appended';
import { RowRenderer } from '../row_renderer';
import {
  createDnsRowRenderer,
  createEndgameProcessRowRenderer,
  createFimRowRenderer,
  createGenericSystemRowRenderer,
  createGenericFileRowRenderer,
  createSecurityEventRowRenderer,
  createSocketRowRenderer,
} from './generic_row_renderer';
import * as i18n from './translations';

jest.mock('../../../../../lib/kibana');

describe('GenericRowRenderer', () => {
  const mount = useMountAppended();

  describe('#createGenericSystemRowRenderer', () => {
    let nonSystem: Ecs;
    let system: Ecs;
    let connectedToRenderer: RowRenderer;
    beforeEach(() => {
      nonSystem = cloneDeep(mockTimelineData[0].ecs);
      system = cloneDeep(mockTimelineData[29].ecs);
      connectedToRenderer = createGenericSystemRowRenderer({
        actionName: 'process_started',
        text: 'some text',
      });
    });
    test('renders correctly against snapshot', () => {
      // I cannot and do not want to use BrowserFields mocks for the snapshot tests as they are too heavy
      const browserFields: BrowserFields = {};
      const children = connectedToRenderer.renderRow({
        browserFields,
        data: system,
        children: <span>{'some children'}</span>,
        timelineId: 'test',
      });

      const wrapper = shallow(<span>{children}</span>);
      expect(wrapper).toMatchSnapshot();
    });

    test('should return false if not a system datum', () => {
      expect(connectedToRenderer.isInstance(nonSystem)).toBe(false);
    });

    test('should return true if it is a system datum', () => {
      expect(connectedToRenderer.isInstance(system)).toBe(true);
    });

    test('should return false when action is set to some other value', () => {
      if (system.event != null && system.event.action != null) {
        system.event.action[0] = 'some other value';
        expect(connectedToRenderer.isInstance(system)).toBe(false);
      } else {
        // if system.event or system.event.action is not defined in the mock
        // then we will get an error here
        expect(system.event).toBeDefined();
      }
    });
    test('should render a system row', () => {
      const children = connectedToRenderer.renderRow({
        browserFields: mockBrowserFields,
        data: system,
        children: <span>{'some children '}</span>,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{children}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toContain(
        'some children Evan@zeek-londonsome text(6278)with resultfailureSource128.199.212.120'
      );
    });
  });

  describe('#createGenericFileRowRenderer', () => {
    let nonSystem: Ecs;
    let systemFile: Ecs;
    let fileToRenderer: RowRenderer;

    beforeEach(() => {
      nonSystem = cloneDeep(mockTimelineData[0].ecs);
      systemFile = cloneDeep(mockTimelineData[28].ecs);
      fileToRenderer = createGenericFileRowRenderer({
        actionName: 'user_login',
        text: 'some text',
      });
    });

    test('renders correctly against snapshot', () => {
      // I cannot and do not want to use BrowserFields mocks for the snapshot tests as they are too heavy
      const browserFields: BrowserFields = {};
      const children = fileToRenderer.renderRow({
        browserFields,
        data: systemFile,
        children: <span>{'some children'}</span>,
        timelineId: 'test',
      });

      const wrapper = shallow(<span>{children}</span>);
      expect(wrapper).toMatchSnapshot();
    });

    test('should return false if not a auditd datum', () => {
      expect(fileToRenderer.isInstance(nonSystem)).toBe(false);
    });

    test('should return true if it is a auditd datum', () => {
      expect(fileToRenderer.isInstance(systemFile)).toBe(true);
    });

    test('should return false when action is set to some other value', () => {
      if (systemFile.event != null && systemFile.event.action != null) {
        systemFile.event.action[0] = 'some other value';
        expect(fileToRenderer.isInstance(systemFile)).toBe(false);
      } else {
        expect(systemFile.event).toBeDefined();
      }
    });

    test('should render a system row', () => {
      const children = fileToRenderer.renderRow({
        browserFields: mockBrowserFields,
        data: systemFile,
        children: <span>{'some children '}</span>,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{children}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toContain(
        'some children Braden@zeek-londonsome text(6278)with resultfailureSource128.199.212.120'
      );
    });
  });

  describe('#createEndgameProcessRowRenderer', () => {
    test('it renders an endgame process creation_event', () => {
      const actionName = 'creation_event';
      const text = i18n.PROCESS_STARTED;
      const endgameCreationEvent = {
        ...mockEndgameCreationEvent,
      };

      const endgameProcessCreationEventRowRenderer = createEndgameProcessRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameProcessCreationEventRowRenderer.isInstance(endgameCreationEvent) &&
            endgameProcessCreationEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: endgameCreationEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children Arun\\Anvi-Acer@HD-obe-8bf77f54started processMicrosoft.Photos.exe(441684)C:\\Program Files\\WindowsApps\\Microsoft.Windows.Photos_2018.18091.17210.0_x64__8wekyb3d8bbwe\\Microsoft.Photos.exe-ServerName:App.AppXzst44mncqdg84v7sv6p7yznqwssy6f7f.mcavia parent processsvchost.exe(8)d4c97ed46046893141652e2ec0056a698f6445109949d7fcabbce331146889ee12563599116157778a22600d2a163d8112aed84562d06d7235b37895b68de56687895743'
      );
    });

    test('it renders an endgame process termination_event', () => {
      const actionName = 'termination_event';
      const text = i18n.TERMINATED_PROCESS;
      const endgameTerminationEvent = {
        ...mockEndgameTerminationEvent,
      };

      const endgameProcessTerminationEventRowRenderer = createEndgameProcessRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameProcessTerminationEventRowRenderer.isInstance(endgameTerminationEvent) &&
            endgameProcessTerminationEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: endgameTerminationEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children Arun\\Anvi-Acer@HD-obe-8bf77f54terminated processRuntimeBroker.exe(442384)with exit code087976f3430cc99bc939e0694247c0759961a49832b87218f4313d6fc0bc3a776797255e72d5ed5c058d4785950eba7abaa057653bd4401441a21bf1abce6404f4231db4d'
      );
    });

    test('it does NOT render the event if the action name does not match', () => {
      const actionName = 'does_not_match';
      const text = i18n.PROCESS_STARTED;
      const endgameCreationEvent = {
        ...mockEndgameCreationEvent,
      };

      const endgameProcessCreationEventRowRenderer = createEndgameProcessRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameProcessCreationEventRowRenderer.isInstance(endgameCreationEvent) &&
            endgameProcessCreationEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: endgameCreationEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('');
    });

    test('it does NOT render the event when the event category is NOT process', () => {
      const actionName = 'creation_event';
      const text = i18n.PROCESS_STARTED;
      const endgameCreationEvent = {
        ...mockEndgameCreationEvent,
        event: {
          ...mockEndgameCreationEvent.event,
          category: ['something_else'],
        },
      };

      const endgameProcessCreationEventRowRenderer = createEndgameProcessRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameProcessCreationEventRowRenderer.isInstance(endgameCreationEvent) &&
            endgameProcessCreationEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: endgameCreationEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('');
    });

    test('it does NOT render the event when both the action name and event category do NOT match', () => {
      const actionName = 'does_not_match';
      const text = i18n.PROCESS_STARTED;
      const endgameCreationEvent = {
        ...mockEndgameCreationEvent,
        event: {
          ...mockEndgameCreationEvent.event,
          category: ['something_else'],
        },
      };

      const endgameProcessCreationEventRowRenderer = createEndgameProcessRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameProcessCreationEventRowRenderer.isInstance(endgameCreationEvent) &&
            endgameProcessCreationEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: endgameCreationEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('');
    });
  });

  describe('#createFimRowRenderer', () => {
    test('it renders an endgame file_create_event', () => {
      const actionName = 'file_create_event';
      const text = i18n.CREATED_FILE;
      const endgameFileCreateEvent = {
        ...mockEndgameFileCreateEvent,
      };

      const endgameFileCreateEventRowRenderer = createFimRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameFileCreateEventRowRenderer.isInstance(endgameFileCreateEvent) &&
            endgameFileCreateEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: endgameFileCreateEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children Arun\\Anvi-Acer@HD-obe-8bf77f54created a fileinC:\\Users\\Arun\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\63d78c21-e593-4484-b7a9-db33cd522ddc.tmpviachrome.exe(11620)'
      );
    });

    test('it renders an endgame file_delete_event', () => {
      const actionName = 'file_delete_event';
      const text = i18n.DELETED_FILE;
      const endgameFileDeleteEvent = {
        ...mockEndgameFileDeleteEvent,
      };

      const endgameFileDeleteEventRowRenderer = createFimRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameFileDeleteEventRowRenderer.isInstance(endgameFileDeleteEvent) &&
            endgameFileDeleteEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: endgameFileDeleteEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children SYSTEM\\NT AUTHORITY@HD-v1s-d2118419deleted a filetmp000002f6inC:\\Windows\\TEMP\\tmp00000404\\tmp000002f6viaAmSvc.exe(1084)'
      );
    });

    test('it renders a FIM (non-endgame) file created event', () => {
      const actionName = 'created';
      const text = i18n.CREATED_FILE;
      const fimFileCreatedEvent = {
        ...mockFimFileCreatedEvent,
      };

      const fileCreatedEventRowRenderer = createFimRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {fileCreatedEventRowRenderer.isInstance(fimFileCreatedEvent) &&
            fileCreatedEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: fimFileCreatedEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children foohostcreated a filein/etc/subgidviaan unknown process'
      );
    });

    test('it renders a FIM (non-endgame) file deleted event', () => {
      const actionName = 'deleted';
      const text = i18n.DELETED_FILE;
      const fimFileDeletedEvent = {
        ...mockFimFileDeletedEvent,
      };

      const fileDeletedEventRowRenderer = createFimRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {fileDeletedEventRowRenderer.isInstance(fimFileDeletedEvent) &&
            fileDeletedEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: fimFileDeletedEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children foohostdeleted a filein/etc/gshadow.lockviaan unknown process'
      );
    });

    test('it does NOT render an event if the action name does not match', () => {
      const actionName = 'does_not_match';
      const text = i18n.CREATED_FILE;
      const endgameFileCreateEvent = {
        ...mockEndgameFileCreateEvent,
      };

      const endgameFileCreateEventRowRenderer = createFimRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameFileCreateEventRowRenderer.isInstance(endgameFileCreateEvent) &&
            endgameFileCreateEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: endgameFileCreateEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('');
    });

    test('it does NOT render an Endgame file_create_event when category is NOT file', () => {
      const actionName = 'file_create_event';
      const text = i18n.CREATED_FILE;
      const endgameFileCreateEvent = {
        ...mockEndgameFileCreateEvent,
        event: {
          ...mockEndgameFileCreateEvent.event,
          category: ['something_else'],
        },
      };

      const endgameFileCreateEventRowRenderer = createFimRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameFileCreateEventRowRenderer.isInstance(endgameFileCreateEvent) &&
            endgameFileCreateEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: endgameFileCreateEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('');
    });

    test('it does NOT render a FIM (non-Endgame) file created event when the event dataset is NOT file', () => {
      const actionName = 'created';
      const text = i18n.CREATED_FILE;
      const fimFileCreatedEvent = {
        ...mockFimFileCreatedEvent,
        event: {
          ...mockEndgameFileCreateEvent.event,
          dataset: ['something_else'],
        },
      };

      const fileCreatedEventRowRenderer = createFimRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {fileCreatedEventRowRenderer.isInstance(fimFileCreatedEvent) &&
            fileCreatedEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: fimFileCreatedEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('');
    });
  });

  describe('#createSocketRowRenderer', () => {
    test('it renders an Endgame ipv4_connection_accept_event', () => {
      const actionName = 'ipv4_connection_accept_event';
      const text = i18n.ACCEPTED_A_CONNECTION_VIA;
      const ipv4ConnectionAcceptEvent = {
        ...mockEndgameIpv4ConnectionAcceptEvent,
      };

      const endgameIpv4ConnectionAcceptEventRowRenderer = createSocketRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameIpv4ConnectionAcceptEventRowRenderer.isInstance(ipv4ConnectionAcceptEvent) &&
            endgameIpv4ConnectionAcceptEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: ipv4ConnectionAcceptEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children SYSTEM\\NT AUTHORITY@HD-gqf-0af7b4feaccepted a connection viaAmSvc.exe(1084)tcp1:network-community_idSource127.0.0.1:49306Destination127.0.0.1:49305'
      );
    });

    test('it renders an Endgame ipv6_connection_accept_event', () => {
      const actionName = 'ipv6_connection_accept_event';
      const text = i18n.ACCEPTED_A_CONNECTION_VIA;
      const ipv6ConnectionAcceptEvent = {
        ...mockEndgameIpv6ConnectionAcceptEvent,
      };

      const endgameIpv6ConnectionAcceptEventRowRenderer = createSocketRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameIpv6ConnectionAcceptEventRowRenderer.isInstance(ipv6ConnectionAcceptEvent) &&
            endgameIpv6ConnectionAcceptEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: ipv6ConnectionAcceptEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children SYSTEM\\NT AUTHORITY@HD-55b-3ec87f66accepted a connection via(4)tcp1:network-community_idSource::1:51324Destination::1:5357'
      );
    });

    test('it renders an Endgame ipv4_disconnect_received_event', () => {
      const actionName = 'ipv4_disconnect_received_event';
      const text = i18n.DISCONNECTED_VIA;
      const ipv4DisconnectReceivedEvent = {
        ...mockEndgameIpv4DisconnectReceivedEvent,
      };

      const endgameIpv4DisconnectReceivedEventRowRenderer = createSocketRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameIpv4DisconnectReceivedEventRowRenderer.isInstance(ipv4DisconnectReceivedEvent) &&
            endgameIpv4DisconnectReceivedEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: ipv4DisconnectReceivedEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children Arun\\Anvi-Acer@HD-obe-8bf77f54disconnected viachrome.exe(11620)8.1KBtcp1:LxYHJJv98b2O0fNccXu6HheXmwk=Source192.168.0.6:59356(25.78%)2.1KB(74.22%)6KBDestination10.156.162.53:443'
      );
    });

    test('it renders an Endgame ipv6_disconnect_received_event', () => {
      const actionName = 'ipv6_disconnect_received_event';
      const text = i18n.DISCONNECTED_VIA;
      const ipv6DisconnectReceivedEvent = {
        ...mockEndgameIpv6DisconnectReceivedEvent,
      };

      const endgameIpv6DisconnectReceivedEventRowRenderer = createSocketRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameIpv6DisconnectReceivedEventRowRenderer.isInstance(ipv6DisconnectReceivedEvent) &&
            endgameIpv6DisconnectReceivedEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: ipv6DisconnectReceivedEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children SYSTEM\\NT AUTHORITY@HD-55b-3ec87f66disconnected via(4)7.9KBtcp1:ZylzQhsB1dcptA2t4DY8S6l9o8E=Source::1:51338(96.92%)7.7KB(3.08%)249BDestination::1:2869'
      );
    });

    test('it renders a (non-Endgame) socket_opened event', () => {
      const actionName = 'socket_opened';
      const text = i18n.SOCKET_OPENED;
      const socketOpenedEvent = {
        ...mockSocketOpenedEvent,
      };

      const socketOpenedEventRowRenderer = createSocketRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {socketOpenedEventRowRenderer.isInstance(socketOpenedEvent) &&
            socketOpenedEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: socketOpenedEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children root@foohostopened a socket withgoogle_accounts(2166)Outbound socket (10.4.20.1:59554 -> 10.1.2.3:80) Ooutboundtcp1:network-community_idSource10.4.20.1:59554Destination10.1.2.3:80'
      );
    });

    test('it renders a (non-Endgame) socket_closed event', () => {
      const actionName = 'socket_closed';
      const text = i18n.SOCKET_CLOSED;
      const socketClosedEvent = {
        ...mockSocketClosedEvent,
      };

      const socketClosedEventRowRenderer = createSocketRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {socketClosedEventRowRenderer.isInstance(socketClosedEvent) &&
            socketClosedEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: socketClosedEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children root@foohostclosed a socket withgoogle_accounts(2166)Outbound socket (10.4.20.1:59508 -> 10.1.2.3:80) Coutboundtcp1:network-community_idSource10.4.20.1:59508Destination10.1.2.3:80'
      );
    });

    test('it does NOT render an event if the action name does not match', () => {
      const actionName = 'does_not_match';
      const text = i18n.ACCEPTED_A_CONNECTION_VIA;
      const ipv4ConnectionAcceptEvent = {
        ...mockEndgameIpv4ConnectionAcceptEvent,
      };

      const endgameIpv4ConnectionAcceptEventRowRenderer = createSocketRowRenderer({
        actionName,
        text,
      });

      const wrapper = mount(
        <TestProviders>
          {endgameIpv4ConnectionAcceptEventRowRenderer.isInstance(ipv4ConnectionAcceptEvent) &&
            endgameIpv4ConnectionAcceptEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: ipv4ConnectionAcceptEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('');
    });
  });

  describe('#createSecurityEventRowRenderer', () => {
    test('it renders an Endgame user_logon event', () => {
      const actionName = 'user_logon';
      const userLogonEvent = {
        ...mockEndgameUserLogon,
      };

      const userLogonEventRowRenderer = createSecurityEventRowRenderer({ actionName });

      const wrapper = mount(
        <TestProviders>
          {userLogonEventRowRenderer.isInstance(userLogonEvent) &&
            userLogonEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: userLogonEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children SYSTEM\\NT AUTHORITY@HD-v1s-d2118419successfully logged inusing logon type5 - Service(target logon ID0x3e7)viaC:\\Windows\\System32\\services.exe(432)as requested by subjectWIN-Q3DOP1UKA81$(subject logon ID0x3e7)4624'
      );
    });

    test('it renders an Endgame admin_logon event', () => {
      const actionName = 'admin_logon';
      const adminLogonEvent = {
        ...mockEndgameAdminLogon,
      };

      const adminLogonEventRowRenderer = createSecurityEventRowRenderer({ actionName });

      const wrapper = mount(
        <TestProviders>
          {adminLogonEventRowRenderer.isInstance(adminLogonEvent) &&
            adminLogonEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: adminLogonEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children With special privileges,SYSTEM\\NT AUTHORITY@HD-obe-8bf77f54successfully logged inviaC:\\Windows\\System32\\lsass.exe(964)as requested by subjectSYSTEM\\NT AUTHORITY4672'
      );
    });

    test('it renders an Endgame explicit_user_logon event', () => {
      const actionName = 'explicit_user_logon';
      const explicitUserLogonEvent = {
        ...mockEndgameExplicitUserLogon,
      };

      const explicitUserLogonEventRowRenderer = createSecurityEventRowRenderer({ actionName });

      const wrapper = mount(
        <TestProviders>
          {explicitUserLogonEventRowRenderer.isInstance(explicitUserLogonEvent) &&
            explicitUserLogonEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: explicitUserLogonEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children A login was attempted using explicit credentialsArun\\Anvi-AcertoHD-55b-3ec87f66viaC:\\Windows\\System32\\svchost.exe(1736)as requested by subjectANVI-ACER$\\WORKGROUP(subject logon ID0x3e7)4648'
      );
    });

    test('it renders an Endgame user_logoff event', () => {
      const actionName = 'user_logoff';
      const userLogoffEvent = {
        ...mockEndgameUserLogoff,
      };

      const userLogoffEventRowRenderer = createSecurityEventRowRenderer({ actionName });

      const wrapper = mount(
        <TestProviders>
          {userLogoffEventRowRenderer.isInstance(userLogoffEvent) &&
            userLogoffEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: userLogoffEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children Arun\\Anvi-Acer@HD-55b-3ec87f66logged offusing logon type2 - Interactive(target logon ID0x16db41e)viaC:\\Windows\\System32\\lsass.exe(964)4634'
      );
    });

    test('it does NOT render an event if the action name does not match', () => {
      const actionName = 'does_not_match';
      const userLogonEvent = {
        ...mockEndgameUserLogon,
      };

      const userLogonEventRowRenderer = createSecurityEventRowRenderer({ actionName });

      const wrapper = mount(
        <TestProviders>
          {userLogonEventRowRenderer.isInstance(userLogonEvent) &&
            userLogonEventRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: userLogonEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('');
    });
  });

  describe('#createDnsRowRenderer', () => {
    test('it renders an Endgame DNS request_event', () => {
      const requestEvent = {
        ...mockEndgameDnsRequest,
      };

      const dnsRowRenderer = createDnsRowRenderer();

      const wrapper = mount(
        <TestProviders>
          {dnsRowRenderer.isInstance(requestEvent) &&
            dnsRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: requestEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children SYSTEM\\NT AUTHORITY@HD-obe-8bf77f54asked forupdate.googleapis.comwith question typeA, which resolved to10.100.197.67viaGoogleUpdate.exe(443192)3008dns'
      );
    });

    test('it renders a non-Endgame DNS event', () => {
      const dnsEvent = {
        ...mockDnsEvent,
      };

      const dnsRowRenderer = createDnsRowRenderer();

      const wrapper = mount(
        <TestProviders>
          {dnsRowRenderer.isInstance(dnsEvent) &&
            dnsRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: dnsEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(
        'some children iot.example.comasked forlookup.example.comwith question typeA, which resolved to10.1.2.3(response code:NOERROR)viaan unknown process6.937500msOct 8, 2019 @ 10:05:23.241Oct 8, 2019 @ 10:05:23.248outbounddns177Budp1:network-community_idSource10.9.9.9:58732(22.60%)40B(77.40%)137BDestination10.1.1.1:53OceaniaAustralia🇦🇺AU'
      );
    });

    test('it does NOT render an event if dns.question.type is not provided', () => {
      const requestEvent = {
        ...mockEndgameDnsRequest,
        dns: {
          ...mockDnsEvent.dns,
          question: {
            name: ['lookup.example.com'],
          },
        },
      };

      const dnsRowRenderer = createDnsRowRenderer();

      const wrapper = mount(
        <TestProviders>
          {dnsRowRenderer.isInstance(requestEvent) &&
            dnsRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: requestEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('');
    });

    test('it does NOT render an event if dns.question.name is not provided', () => {
      const requestEvent = {
        ...mockEndgameDnsRequest,
        dns: {
          ...mockDnsEvent.dns,
          question: {
            type: ['A'],
          },
        },
      };

      const dnsRowRenderer = createDnsRowRenderer();

      const wrapper = mount(
        <TestProviders>
          {dnsRowRenderer.isInstance(requestEvent) &&
            dnsRowRenderer.renderRow({
              browserFields: mockBrowserFields,
              data: requestEvent,
              children: <span>{'some children '}</span>,
              timelineId: 'test',
            })}
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('');
    });
  });
});
