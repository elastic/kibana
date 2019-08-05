/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { KibanaContext } from '../../../../../contexts/kibana';
import { kibanaContextValueMock } from '../../../../../contexts/kibana/__mocks__/kibana_context_value';

import { StepCreateForm } from './step_create_form';

jest.mock('../../../../../contexts/ui/use_ui_chrome_context');

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Data Frame: <StepCreateForm />', () => {
  test('Minimal initialization', () => {
    const props = {
      createIndexPattern: false,
      transformId: 'the-transform-id',
      transformConfig: {},
      overrides: { created: false, started: false, indexPatternId: undefined },
      onChange() {},
    };

    // Using a wrapping <div> element because shallow() would fail
    // with the Provider being the outer most component.
    const wrapper = shallow(
      <div>
        <KibanaContext.Provider value={kibanaContextValueMock}>
          <StepCreateForm {...props} />
        </KibanaContext.Provider>
      </div>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
