/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { JSONDownloaderComponent, jsonToNDJSON, ndjsonToJSON } from './index';

const jsonArray = [
  {
    description: 'Detecting root and admin users1',
    created_by: 'elastic',
    false_positives: [],
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    max_signals: 100,
  },
  {
    description: 'Detecting root and admin users2',
    created_by: 'elastic',
    false_positives: [],
    index: ['auditbeat-*', 'packetbeat-*', 'winlogbeat-*'],
    max_signals: 101,
  },
];

const ndjson = `{"description":"Detecting root and admin users1","created_by":"elastic","false_positives":[],"index":["auditbeat-*","filebeat-*","packetbeat-*","winlogbeat-*"],"max_signals":100}
{"description":"Detecting root and admin users2","created_by":"elastic","false_positives":[],"index":["auditbeat-*","packetbeat-*","winlogbeat-*"],"max_signals":101}`;

const ndjsonSorted = `{"created_by":"elastic","description":"Detecting root and admin users1","false_positives":[],"index":["auditbeat-*","filebeat-*","packetbeat-*","winlogbeat-*"],"max_signals":100}
{"created_by":"elastic","description":"Detecting root and admin users2","false_positives":[],"index":["auditbeat-*","packetbeat-*","winlogbeat-*"],"max_signals":101}`;

describe('JSONDownloader', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <JSONDownloaderComponent filename={'export_rules.ndjson'} onExportComplete={jest.fn()} />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  describe('jsonToNDJSON', () => {
    test('converts to NDJSON', () => {
      const output = jsonToNDJSON(jsonArray, false);
      expect(output).toEqual(ndjson);
    });

    test('converts to NDJSON with keys sorted', () => {
      const output = jsonToNDJSON(jsonArray);
      expect(output).toEqual(ndjsonSorted);
    });
  });

  describe('ndjsonToJSON', () => {
    test('converts to JSON', () => {
      const output = ndjsonToJSON(ndjson);
      expect(output).toEqual(jsonArray);
    });
  });
});
