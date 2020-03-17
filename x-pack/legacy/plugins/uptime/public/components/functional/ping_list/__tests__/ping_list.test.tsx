/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { PingListComponent, AllLocationOption, toggleDetails } from '../ping_list';
import { ExpandedRowMap } from '../../monitor_list/types';
import { Ping, PingsResponse } from '../../../../../common/types/ping/ping';

describe('PingList component', () => {
  let response: PingsResponse;

  beforeEach(() => {
    response = {
      total: 9231,
      locations: ['nyc'],
      pings: [
        {
          '@timestamp': '2019-01-28T17:47:08.078Z',
          error: {
            message: 'dial tcp 127.0.0.1:9200: connect: connection refused',
            type: 'io',
          },
          monitor: {
            duration: { us: 1430 },
            id: 'auto-tcp-0X81440A68E839814F',
            ip: '127.0.0.1',
            name: '',
            status: 'down',
            type: 'tcp',
          },
        },
        {
          '@timestamp': '2019-01-28T17:47:09.075Z',
          error: {
            message: 'dial tcp 127.0.0.1:9200: connect: connection refused',
            type: 'io',
          },
          monitor: {
            duration: { us: 1370 },
            id: 'auto-tcp-0X81440A68E839814D',
            ip: '127.0.0.1',
            name: '',
            status: 'down',
            type: 'tcp',
          },
        },
        {
          '@timestamp': '2019-01-28T17:47:06.077Z',
          monitor: {
            duration: { us: 1452 },
            id: 'auto-tcp-0X81440A68E839814D',
            ip: '127.0.0.1',
            name: '',
            status: 'up',
            type: 'tcp',
          },
        },
        {
          '@timestamp': '2019-01-28T17:47:07.075Z',
          error: {
            message: 'dial tcp 127.0.0.1:9200: connect: connection refused',
            type: 'io',
          },
          monitor: {
            duration: { us: 1094 },
            id: 'auto-tcp-0X81440A68E839814E',
            ip: '127.0.0.1',
            name: '',
            status: 'down',
            type: 'tcp',
          },
        },
        {
          '@timestamp': '2019-01-28T17:47:07.074Z',
          error: {
            message:
              'Get http://localhost:12349/: dial tcp 127.0.0.1:12349: connect: connection refused',
            type: 'io',
          },
          monitor: {
            duration: { us: 1597 },
            id: 'auto-http-0X3675F89EF061209G',
            ip: '127.0.0.1',
            name: '',
            status: 'down',
            type: 'http',
          },
        },
        {
          '@timestamp': '2019-01-28T17:47:18.080Z',
          error: {
            message: 'dial tcp 127.0.0.1:9200: connect: connection refused',
            type: 'io',
          },
          monitor: {
            duration: { us: 1699 },
            id: 'auto-tcp-0X81440A68E839814H',
            ip: '127.0.0.1',
            name: '',
            status: 'down',
            type: 'tcp',
          },
        },
        {
          '@timestamp': '2019-01-28T17:47:19.076Z',
          error: {
            message: 'dial tcp 127.0.0.1:9200: connect: connection refused',
            type: 'io',
          },
          monitor: {
            duration: { us: 5384 },
            id: 'auto-tcp-0X81440A68E839814I',
            ip: '127.0.0.1',
            name: '',
            status: 'down',
            type: 'tcp',
          },
        },
        {
          '@timestamp': '2019-01-28T17:47:19.076Z',
          error: {
            message:
              'Get http://localhost:12349/: dial tcp 127.0.0.1:12349: connect: connection refused',
            type: 'io',
          },
          monitor: {
            duration: { us: 5397 },
            id: 'auto-http-0X3675F89EF061209J',
            ip: '127.0.0.1',
            name: '',
            status: 'down',
            type: 'http',
          },
        },
        {
          '@timestamp': '2019-01-28T17:47:19.077Z',
          http: { response: { status_code: 200 } },
          monitor: {
            duration: { us: 127511 },
            id: 'auto-tcp-0X81440A68E839814C',
            ip: '172.217.7.4',
            name: '',
            status: 'up',
            type: 'http',
          },
        },
        {
          '@timestamp': '2019-01-28T17:47:19.077Z',
          http: { response: { status_code: 200 } },
          monitor: {
            duration: { us: 287543 },
            id: 'auto-http-0X131221E73F825974',
            ip: '192.30.253.112',
            name: '',
            status: 'up',
            type: 'http',
          },
        },
      ],
    };
  });

  it('renders sorted list without errors', () => {
    const component = shallowWithIntl(
      <PingListComponent
        dateRangeStart="now-15m"
        dateRangeEnd="now"
        getPings={jest.fn()}
        loading={false}
        locations={[]}
        monitorId="foo"
        onPageCountChange={jest.fn()}
        onSelectedLocationChange={(loc: any[]) => {}}
        onSelectedStatusChange={jest.fn()}
        pageSize={30}
        pings={response.pings}
        size={10}
        status="all"
        selectedOption="down"
        selectedLocation={AllLocationOption.value}
      />
    );
    expect(component).toMatchSnapshot();
  });

  describe('toggleDetails', () => {
    let itemIdToExpandedRowMap: ExpandedRowMap;
    let pings: Ping[];

    const setItemIdToExpandedRowMap = (update: ExpandedRowMap) => (itemIdToExpandedRowMap = update);

    beforeEach(() => {
      itemIdToExpandedRowMap = {};
      pings = response.pings;
    });

    it('should expand an item if empty', () => {
      const ping = pings[0];
      toggleDetails(ping, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);
      expect(itemIdToExpandedRowMap).toMatchInlineSnapshot(`
        Object {
          "2019-01-28T17:47:08.078Z": <PingListExpandedRowComponent
            ping={
              Object {
                "@timestamp": "2019-01-28T17:47:08.078Z",
                "error": Object {
                  "message": "dial tcp 127.0.0.1:9200: connect: connection refused",
                  "type": "io",
                },
                "monitor": Object {
                  "duration": Object {
                    "us": 1430,
                  },
                  "id": "auto-tcp-0X81440A68E839814C",
                  "ip": "127.0.0.1",
                  "name": "",
                  "status": "down",
                  "type": "tcp",
                },
              }
            }
          />,
        }
      `);
    });

    it('should un-expand an item if clicked again', () => {
      const ping = pings[0];
      toggleDetails(ping, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);
      toggleDetails(ping, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);
      expect(itemIdToExpandedRowMap).toEqual({});
    });

    it('should expand the new row and close the old when when a new row is clicked', () => {
      const pingA = pings[0];
      const pingB = pings[1];
      toggleDetails(pingA, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);
      toggleDetails(pingB, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);
      expect(pingA['@timestamp']).not.toEqual(pingB['@timestamp']);
      expect(itemIdToExpandedRowMap[pingB['@timestamp']]).toMatchInlineSnapshot(`
        <PingListExpandedRowComponent
          ping={
            Object {
              "@timestamp": "2019-01-28T17:47:09.075Z",
              "error": Object {
                "message": "dial tcp 127.0.0.1:9200: connect: connection refused",
                "type": "io",
              },
              "monitor": Object {
                "duration": Object {
                  "us": 1370,
                },
                "id": "auto-tcp-0X81440A68E839814D",
                "ip": "127.0.0.1",
                "name": "",
                "status": "down",
                "type": "tcp",
              },
            }
          }
        />
      `);
    });
  });
});
