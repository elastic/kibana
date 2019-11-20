/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiProgress } from '@elastic/eui';
import { Loader } from './loader';
import { mount } from 'enzyme';

describe('loader', () => {
  it('shows a loading indicator when loading', async () => {
    const load = jest.fn(() => Promise.resolve());
    const inst = mount(<Loader loadDeps={[]} load={load} />);

    expect(inst.find(EuiProgress).length).toEqual(1);

    await load();
    inst.update();

    expect(inst.find(EuiProgress).length).toEqual(0);
  });

  it('hides loading indicator when failed', async () => {
    const load = jest.fn(() => Promise.reject());
    const inst = mount(<Loader loadDeps={[]} load={load} />);

    expect(inst.find(EuiProgress).length).toEqual(1);

    await Promise.resolve();
    inst.update();

    expect(inst.find(EuiProgress).length).toEqual(0);
  });

  it('does not run load in parallel', async () => {
    let count = 0;
    let ranInParallel = false;
    const load = jest.fn(() => {
      if (count) {
        ranInParallel = true;
      }
      ++count;
      return Promise.resolve().then(() => --count);
    });
    const inst = mount(<Loader loadDeps={['bar']} load={load} />);
    inst.setProps({ loadDeps: ['foo'] });
    inst.update();

    await Promise.resolve();
    inst.update();

    expect(load).toHaveBeenCalledTimes(2);
    expect(ranInParallel).toBeFalsy();
  });
});
