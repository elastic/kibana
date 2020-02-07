/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';

type WrapperOf<F extends (...args: any) => any> = (...args: Parameters<F>) => ReturnType<F>; // eslint-disable-line
export type MountAppended = WrapperOf<typeof mount>;

export const useMountAppended = () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.removeChild(root);
  });

  const mountAppended: MountAppended = (node, options) =>
    mount(node, { ...options, attachTo: root });

  return mountAppended;
};
