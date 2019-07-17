/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, mount } from 'enzyme';
import { InitializableComponent } from './initializable_component';

function resolvable() {
  let resolve: (value: {}) => void;

  return {
    promise: new Promise(res => (resolve = res)),
    resolve: (x: {}) => resolve(x),
  };
}

describe('InitializableComponent', () => {
  test('renders nothing if loading', () => {
    const component = render(
      <InitializableComponent
        watch={[true]}
        init={() => Promise.resolve({ hello: 'world' })}
        render={props => <div>{props!.hello}</div>}
      />
    );

    expect(component).toMatchInlineSnapshot(`null`);
  });

  test('passes the resolved props to render', async () => {
    const initPromise = Promise.resolve({ test: 'props' });
    const mockRender = jest.fn(() => <div />);

    mount(<InitializableComponent watch={[true]} init={() => initPromise} render={mockRender} />);

    await initPromise;
    expect(mockRender).toHaveBeenCalledWith({ test: 'props' });
  });

  test('allows an undefined resolve', async () => {
    const initPromise = Promise.resolve();
    const mockRender = jest.fn(() => <div />);

    mount(<InitializableComponent watch={[true]} init={() => initPromise} render={mockRender} />);

    await initPromise;
    expect(mockRender).toHaveBeenCalledWith(undefined);
  });

  test('ignores stale promise results', async () => {
    const firstInit = resolvable();
    const secondInit = resolvable();
    const mockRender = jest.fn(() => <div />);

    const component = mount(
      <InitializableComponent watch={['a']} init={() => firstInit.promise} render={mockRender} />
    );

    component.setProps({
      watch: ['b'],
      init: () => secondInit.promise,
      render: mockRender,
    });

    firstInit.resolve({ hello: 1 });
    secondInit.resolve({ hello: 2 });
    await secondInit.promise;

    expect(mockRender).not.toHaveBeenCalledWith({ hello: 1 });
    expect(mockRender).toHaveBeenCalledWith({ hello: 2 });
  });
});
