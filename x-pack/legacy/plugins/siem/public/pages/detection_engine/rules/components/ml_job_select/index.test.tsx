/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { MlJobSelect } from './index';
import { useForm } from '../../../../../shared_imports';
import { useSiemJobs } from '../../../../../components/ml_popover/hooks/use_siem_jobs';
jest.mock('../../../../../components/ml_popover/hooks/use_siem_jobs');
jest.mock('../../../../../lib/kibana');

describe('MlJobSelect', () => {
  beforeAll(() => {
    (useSiemJobs as jest.Mock).mockReturnValue([false, []]);
  });

  it('renders correctly against the snapshot', () => {
    const Component = () => {
      const { form } = useForm();

      return (
        <MlJobSelect
          describedByIds={[]}
          field={{
            path: 'path',
            type: 'type',
            value: [],
            isPristine: false,
            isValidating: false,
            isValidated: false,
            isChangingValue: false,
            form,
            errors: [],
            getErrorsMessages: jest.fn(),
            onChange: jest.fn(),
            setValue: jest.fn(),
            setErrors: jest.fn(),
            clearErrors: jest.fn(),
            validate: jest.fn(),
            reset: jest.fn(),
            __serializeOutput: jest.fn(),
          }}
        />
      );
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive()).toMatchSnapshot();
  });
});
