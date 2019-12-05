/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { observerComponent } from './observer_component';
import { basicStateManager } from './state_manager';
import { act } from '@testing-library/react';

interface Props {
  title: string;
}

describe('observerComponent', () => {
  it('should render only once if the relevant state is unchanged', () => {
    const manager = basicStateManager('hello');
    const Raw = jest.fn(({ title }: Props) => <h1>{title}</h1>);
    const Bound = observerComponent(manager.state$.pipe(map(title => ({ title }))), Raw);
    const component = mount(<Bound />);
    manager.setState(() => 'hello');
    expect(Raw).toHaveBeenCalledTimes(1);
    expect(component.html()).toMatchInlineSnapshot(`"<h1>hello</h1>"`);
  });

  it('should rerender if the relevant state changes', () => {
    const manager = basicStateManager('hello');
    const Raw = jest.fn(({ title }: Props) => <h1>{title}</h1>);
    const Bound = observerComponent(manager.state$.pipe(map(title => ({ title }))), Raw);
    const component = mount(<Bound />);
    act(() => manager.setState(() => 'goodbye'));
    expect(Raw).toHaveBeenCalledTimes(2);
    expect(component.html()).toMatchInlineSnapshot(`"<h1>goodbye</h1>"`);
  });

  it('should pass props through to the underlying component', () => {
    const manager = basicStateManager('hello');
    const Raw = ({ title, x }: Props & { x: number }) => <h1>{`${title}_${x}`}</h1>;
    const Bound = observerComponent<{ x: number }, Props>(
      manager.state$.pipe(map(title => ({ title }))),
      Raw
    );
    const component = mount(<Bound x={42} />);
    expect(component.html()).toMatchInlineSnapshot(`"<h1>hello_42</h1>"`);
  });

  it('should pass props to the observable function', () => {
    const manager = basicStateManager('hello');
    const Raw = ({ title, x }: Props & { x: number }) => <h1>{`${title}_${x}`}</h1>;
    const Bound = observerComponent<{ x: number }, Props>(
      props$ =>
        combineLatest(props$, manager.state$).pipe(
          map(([{ x }, title]) => ({ title: title.substring(x) }))
        ),
      Raw
    );
    const component = mount(<Bound x={2} />);
    expect(component.html()).toMatchInlineSnapshot(`"<h1>llo_2</h1>"`);
    act(() => {
      manager.setState(() => 'aabb');
    });
    expect(component.html()).toMatchInlineSnapshot(`"<h1>bb_2</h1>"`);
    act(() => {
      component.setProps({ x: 1 });
    });
    expect(component.html()).toMatchInlineSnapshot(`"<h1>abb_1</h1>"`);
  });
});
