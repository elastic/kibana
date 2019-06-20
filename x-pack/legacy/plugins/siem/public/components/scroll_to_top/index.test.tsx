/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { HookWrapper } from '../../mock/hook_wrapper';
import { scrollToTop } from '.';

interface Global extends NodeJS.Global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window?: any;
}

const globalNode: Global = global;

const spyScroll = jest.fn();
const spyScrollTo = jest.fn();

describe('Scroll to top', () => {
  beforeEach(() => {
    spyScroll.mockClear();
    spyScrollTo.mockClear();
  });

  test('scroll have been called', () => {
    Object.defineProperty(globalNode.window, 'scroll', { value: spyScroll });
    mount(<HookWrapper hook={() => scrollToTop()} />);

    expect(spyScroll).toHaveBeenCalledWith({
      top: 0,
      left: 0,
    });
  });

  test('scrollTo have been called', () => {
    Object.defineProperty(globalNode.window, 'scroll', { value: null });
    Object.defineProperty(globalNode.window, 'scrollTo', { value: spyScrollTo });
    mount(<HookWrapper hook={() => scrollToTop()} />);
    expect(spyScrollTo).toHaveBeenCalled();
  });
});
