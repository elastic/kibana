/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React, { ComponentType } from 'react';
import { BehaviorSubject } from 'rxjs';

import { injectObservablesAsProps } from './observable_utils';

interface Props {
  testProp: string;
}

describe('observable_utils', () => {
  test('injectObservablesAsProps()', () => {
    // an observable that allows us to trigger updating some text.
    const observable$ = new BehaviorSubject('initial text');

    // a simple stateless component that just renders some text
    const TestComponent: React.FC<Props> = ({ testProp }) => {
      return <span>{testProp}</span>;
    };

    // injectObservablesAsProps wraps the observable in a new component
    const ObservableComponent = injectObservablesAsProps(
      { testProp: observable$ },
      (TestComponent as any) as ComponentType
    );

    const wrapper = shallow(<ObservableComponent />);

    // the component should render with "initial text"
    expect(wrapper).toMatchSnapshot();

    observable$.next('updated text');

    // the component should render with "updated text"
    expect(wrapper).toMatchSnapshot();
  });
});
