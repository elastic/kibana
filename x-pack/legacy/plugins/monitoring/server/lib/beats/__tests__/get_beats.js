/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { response, defaultResponseSort } from '../../__tests__/helpers';
import { handleResponse } from '../get_beats';
import expect from '@kbn/expect';

describe('beats/get_beats', () => {
  it('Handles empty response', () => {
    expect(handleResponse()).to.eql([]);
  });

  it('Maps hits into a listing', () => {
    expect(handleResponse(response, 1515534342000, 1515541592880)).to.eql([
      {
        bytes_sent_rate: 18.756344057548876,
        errors: 7,
        memory: 2340,
        name: 'beat-listing.test-0101',
        output: 'Redis',
        total_events_rate: 2.8548258969945715,
        type: 'Filebeat',
        uuid: 'fooUuid',
        version: '6.2.0'
      }
    ]);
  });

  it('Timestamp is desc', () => {
    const { beats, version } = defaultResponseSort(handleResponse);
    expect(beats[0].version).to.eql(version[0]);
    expect(beats[1].version).to.eql(version[1]);
    expect(beats[2].version).to.eql(version[2]);
  });
});
