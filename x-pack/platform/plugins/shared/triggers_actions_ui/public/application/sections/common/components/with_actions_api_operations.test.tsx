/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { shallow, mount } from 'enzyme';
import { withActionOperations, ComponentOpts } from './with_actions_api_operations';
import * as actionApis from '../../../lib/action_connector_api';
import { useKibana } from '../../../../common/lib/kibana';
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../lib/action_connector_api');

describe('with_action_api_operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extends any component with Action Api methods', () => {
    const ComponentToExtend = (props: ComponentOpts) => {
      expect(typeof props.loadActionTypes).toEqual('function');
      return <div />;
    };

    const ExtendedComponent = withActionOperations(ComponentToExtend);
    expect(shallow(<ExtendedComponent />).type()).toEqual(ComponentToExtend);
  });

  it('loadActionTypes calls the loadActionTypes api', () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = ({ loadActionTypes }: ComponentOpts) => {
      return <button onClick={() => loadActionTypes()}>{'call api'}</button>;
    };

    const ExtendedComponent = withActionOperations(ComponentToExtend);
    const component = mount(<ExtendedComponent />);
    component.find('button').simulate('click');

    expect(actionApis.loadActionTypes).toHaveBeenCalledTimes(1);
    expect(actionApis.loadActionTypes).toHaveBeenCalledWith({ http, includeSystemActions: true });
  });
});
