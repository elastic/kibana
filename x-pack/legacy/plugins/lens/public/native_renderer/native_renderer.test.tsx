/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { NativeRenderer } from './native_renderer';
import { act } from 'react-dom/test-utils';

function renderAndTriggerHooks(element: JSX.Element, mountpoint: Element) {
  // act takes care of triggering state hooks
  act(() => {
    render(element, mountpoint);
  });
}

describe('native_renderer', () => {
  let mountpoint: Element;

  beforeEach(() => {
    mountpoint = document.createElement('div');
  });

  afterEach(() => {
    mountpoint.remove();
  });

  it('should render element in container', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    renderAndTriggerHooks(
      <NativeRenderer render={renderSpy} nativeProps={testProps} />,
      mountpoint
    );
    const containerElement = mountpoint.firstElementChild;
    expect(renderSpy).toHaveBeenCalledWith(containerElement, testProps);
  });

  it('should render again if props change', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    renderAndTriggerHooks(
      <NativeRenderer render={renderSpy} nativeProps={testProps} />,
      mountpoint
    );
    renderAndTriggerHooks(
      <NativeRenderer render={renderSpy} nativeProps={{ a: 'def' }} />,
      mountpoint
    );
    renderAndTriggerHooks(
      <NativeRenderer render={renderSpy} nativeProps={{ a: 'def' }} />,
      mountpoint
    );
    expect(renderSpy).toHaveBeenCalledTimes(3);
    const containerElement = mountpoint.firstElementChild;
    expect(renderSpy).lastCalledWith(containerElement, { a: 'def' });
  });

  it('should render again if props is just a string', () => {
    const renderSpy = jest.fn();
    const testProps = 'abc';

    renderAndTriggerHooks(
      <NativeRenderer render={renderSpy} nativeProps={testProps} />,
      mountpoint
    );
    renderAndTriggerHooks(<NativeRenderer render={renderSpy} nativeProps="def" />, mountpoint);
    renderAndTriggerHooks(<NativeRenderer render={renderSpy} nativeProps="def" />, mountpoint);
    expect(renderSpy).toHaveBeenCalledTimes(3);
    const containerElement = mountpoint.firstElementChild;
    expect(renderSpy).lastCalledWith(containerElement, 'def');
  });

  it('should render again if props are extended', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    renderAndTriggerHooks(
      <NativeRenderer render={renderSpy} nativeProps={testProps} />,
      mountpoint
    );
    renderAndTriggerHooks(
      <NativeRenderer render={renderSpy} nativeProps={{ a: 'abc', b: 'def' }} />,
      mountpoint
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);
    const containerElement = mountpoint.firstElementChild;
    expect(renderSpy).lastCalledWith(containerElement, { a: 'abc', b: 'def' });
  });

  it('should render again if props are limited', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc', b: 'def' };

    renderAndTriggerHooks(
      <NativeRenderer render={renderSpy} nativeProps={testProps} />,
      mountpoint
    );
    renderAndTriggerHooks(
      <NativeRenderer render={renderSpy} nativeProps={{ a: 'abc' }} />,
      mountpoint
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);
    const containerElement = mountpoint.firstElementChild;
    expect(renderSpy).lastCalledWith(containerElement, { a: 'abc' });
  });

  it('should render a div as container', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    renderAndTriggerHooks(
      <NativeRenderer render={renderSpy} nativeProps={testProps} />,
      mountpoint
    );
    const containerElement: Element = mountpoint.firstElementChild!;
    expect(containerElement.nodeName).toBe('DIV');
  });

  it('should pass regular html attributes to the wrapping element', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    renderAndTriggerHooks(
      <NativeRenderer
        render={renderSpy}
        nativeProps={testProps}
        className="testClass"
        data-test-subj="container"
      />,
      mountpoint
    );
    const containerElement: HTMLElement = mountpoint.firstElementChild! as HTMLElement;
    expect(containerElement.className).toBe('testClass');
    expect(containerElement.dataset.testSubj).toBe('container');
  });

  it('should render a specified element as container', () => {
    const renderSpy = jest.fn();
    const testProps = { a: 'abc' };

    renderAndTriggerHooks(
      <NativeRenderer render={renderSpy} tag="span" nativeProps={testProps} />,
      mountpoint
    );
    const containerElement: Element = mountpoint.firstElementChild!;
    expect(containerElement.nodeName).toBe('SPAN');
  });
});
