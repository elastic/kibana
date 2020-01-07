/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { mockDetailItemData } from '../../mock';

import { buildJsonView, JsonView } from './json_view';

describe('JSON View', () => {
  describe('rendering', () => {
    test('should match snapshot', () => {
      const wrapper = shallow(<JsonView data={mockDetailItemData} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('buildJsonView', () => {
    test('should match a json', () => {
      const expectedData = {
        '@timestamp': '2019-02-28T16:50:54.621Z',
        _id: 'pEMaMmkBUV60JmNWmWVi',
        _index: 'filebeat-8.0.0-2019.02.19-000001',
        _score: 1,
        _type: '_doc',
        agent: {
          ephemeral_id: '9d391ef2-a734-4787-8891-67031178c641',
          hostname: 'siem-kibana',
          id: '5de03d5f-52f3-482e-91d4-853c7de073c3',
          type: 'filebeat',
          version: '8.0.0',
        },
        cloud: {
          availability_zone: 'projects/189716325846/zones/us-east1-b',
          instance: {
            id: '5412578377715150143',
            name: 'siem-kibana',
          },
          machine: {
            type: 'projects/189716325846/machineTypes/n1-standard-1',
          },
          project: {
            id: 'elastic-beats',
          },
          provider: 'gce',
        },
        destination: {
          bytes: 584,
          ip: '10.47.8.200',
          packets: 4,
          port: 902,
        },
      };
      expect(buildJsonView(mockDetailItemData)).toEqual(expectedData);
    });
  });
});
