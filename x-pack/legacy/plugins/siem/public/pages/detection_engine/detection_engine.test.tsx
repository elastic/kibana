/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { useParams } from 'react-router-dom';

import '../../mock/match_media';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { DetectionEnginePageComponent } from './detection_engine';
import { useUserInfo } from './components/user_info';

jest.mock('./components/user_info');
jest.mock('../../lib/kibana');
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn(),
  };
});

describe('DetectionEnginePageComponent', () => {
  beforeAll(() => {
    (useParams as jest.Mock).mockReturnValue({});
    (useUserInfo as jest.Mock).mockReturnValue({});
  });
  it('renders correctly', () => {
    const wrapper = shallow(
      <DetectionEnginePageComponent
        query={{ query: 'query', language: 'language' }}
        filters={[]}
        setAbsoluteRangeDatePicker={setAbsoluteRangeDatePicker}
      />
    );

    expect(wrapper.find('WithSource')).toHaveLength(1);
  });
});
