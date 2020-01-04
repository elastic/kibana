/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import { clone } from 'lodash/fp';
import * as React from 'react';
import { ActionCreator } from 'typescript-fsa';

import { FlowDirection, FlowTarget } from '../../graphql/types';

import { FlowTargetSelect } from './flow_target_select';

describe('FlowTargetSelect Component', () => {
  const TestFlowTargetId = 'TestFlowTargetId';

  const mockProps = {
    id: TestFlowTargetId,
    selectedDirection: FlowDirection.uniDirectional,
    isLoading: false,
    selectedTarget: FlowTarget.source,
    updateFlowTargetAction: (jest.fn() as unknown) as ActionCreator<{
      flowTarget: FlowTarget;
    }>,
  };

  describe('rendering', () => {
    test('it renders the FlowTargetSelect', () => {
      const wrapper = shallow(<FlowTargetSelect {...mockProps} />);

      expect(wrapper).toMatchSnapshot();
    });
  });

  test('selecting destination from the type drop down', () => {
    const wrapper = mount(<FlowTargetSelect {...mockProps} />);

    wrapper
      .find('button')
      .first()
      .simulate('click');

    wrapper.update();

    wrapper
      .find(`button#${TestFlowTargetId}-select-flow-target-destination`)
      .first()
      .simulate('click');

    wrapper.update();

    // @ts-ignore property mock does not exists
    expect(mockProps.updateFlowTargetAction.mock.calls[0][0]).toEqual({
      flowTarget: 'destination',
    });
  });

  test('when selectedDirection=unidirectional only source/destination are options', () => {
    const wrapper = mount(<FlowTargetSelect {...mockProps} />);

    wrapper
      .find('button')
      .first()
      .simulate('click');

    wrapper.update();

    expect(
      wrapper.find(`button#${TestFlowTargetId}-select-flow-target-source`).exists()
    ).toBeTruthy();
    expect(
      wrapper.find(`button#${TestFlowTargetId}-select-flow-target-destination`).exists()
    ).toBeTruthy();
    expect(
      wrapper.find(`button#${TestFlowTargetId}-select-flow-target-client`).exists()
    ).toBeFalsy();
    expect(
      wrapper.find(`button#${TestFlowTargetId}-select-flow-target-server`).exists()
    ).toBeFalsy();
  });

  test('when selectedDirection=bidirectional source/destination/client/server are options', () => {
    const bidirectionalMock = clone(mockProps);
    bidirectionalMock.selectedDirection = FlowDirection.biDirectional;

    const wrapper = mount(<FlowTargetSelect {...bidirectionalMock} />);

    wrapper
      .find('button')
      .first()
      .simulate('click');

    wrapper.update();

    expect(
      wrapper.find(`button#${TestFlowTargetId}-select-flow-target-source`).exists()
    ).toBeTruthy();
    expect(
      wrapper.find(`button#${TestFlowTargetId}-select-flow-target-destination`).exists()
    ).toBeTruthy();
    expect(
      wrapper.find(`button#${TestFlowTargetId}-select-flow-target-client`).exists()
    ).toBeTruthy();
    expect(
      wrapper.find(`button#${TestFlowTargetId}-select-flow-target-server`).exists()
    ).toBeTruthy();
  });
});
