/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { createPublicShim } from '../../../../../shim';
import { getAppProviders } from '../../../../app_dependencies';

import { StepCreateForm } from './step_create_form';

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

jest.mock('ui/new_platform');
jest.mock('../../../../../shared_imports');

describe('Transform: <StepCreateForm />', () => {
  test('Minimal initialization', () => {
    const props = {
      createIndexPattern: false,
      transformId: 'the-transform-id',
      transformConfig: {},
      overrides: { created: false, started: false, indexPatternId: undefined },
      onChange() {},
    };

    const Providers = getAppProviders(createPublicShim());
    const wrapper = shallow(
      <Providers>
        <StepCreateForm {...props} />
      </Providers>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
