/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import { KibanaContext } from '../../../../../contexts/kibana';
import { kibanaContextValueMock } from '../../../../../contexts/kibana/__mocks__/kibana_context_value';

jest.mock('../../../../../contexts/ui/use_ui_chrome_context');
jest.mock('ui/new_platform');

import { Exploration } from './exploration';

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Data Frame Analytics: <Exploration />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(
      <KibanaContext.Provider value={kibanaContextValueMock}>
        <Exploration jobId="the-job-id" jobStatus={DATA_FRAME_TASK_STATE.STOPPED} />
      </KibanaContext.Provider>
    );
    // Without the jobConfig being loaded, the component will just return empty.
    expect(wrapper.text()).toMatch('');
    // TODO Once React 16.9 is available we can write tests covering asynchronous hooks.
  });
});
