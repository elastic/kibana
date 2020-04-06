/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { QueryBarDefineRule } from './index';
import { useForm } from '../../../../../shared_imports';

jest.mock('../../../../../lib/kibana');

describe('QueryBarDefineRule', () => {
  it('renders correctly against the snapshot', () => {
    const Component = () => {
      const { form } = useForm();

      return (
        <QueryBarDefineRule
          browserFields={{}}
          isLoading={false}
          indexPattern={{ fields: [], title: 'title' }}
          onCloseTimelineSearch={jest.fn()}
          openTimelineSearch={true}
          dataTestSubj="query-bar-define-rule"
          idAria="idAria"
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

    expect(wrapper.dive().find('[data-test-subj="query-bar-define-rule"]')).toHaveLength(1);
  });
});
