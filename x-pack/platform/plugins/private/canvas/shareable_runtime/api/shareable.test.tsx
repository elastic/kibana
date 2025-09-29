/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { sharedWorkpads, tick } from '../test';
import { share } from './shareable';

// Mock the renderers within this test.
jest.mock('../supported_renderers');

describe('Canvas Shareable Workpad API', () => {
  // Mock the AJAX load of the workpad.
  beforeEach(function () {
    global.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => sharedWorkpads.hello,
      });
    });
  });

  test('Placed successfully with default properties', async () => {
    const { container } = render(
      <div kbn-canvas-shareable="canvas" kbn-canvas-url="workpad.json" />
    );
    expect(container).toMatchSnapshot();
    share();
    await tick();
    expect(container).toMatchSnapshot();
  });

  test('Placed successfully with height specified', async () => {
    const { container } = render(
      <div kbn-canvas-shareable="canvas" kbn-canvas-height="350" kbn-canvas-url="workpad.json" />
    );
    expect(container).toMatchSnapshot();
    share();
    await tick();
    expect(container.querySelector('.container')).toHaveStyle('height: 350px; width: 525px;');
    expect(container).toMatchSnapshot();
  });

  test('Placed successfully with width specified', async () => {
    const { container } = render(
      <div kbn-canvas-shareable="canvas" kbn-canvas-width="400" kbn-canvas-url="workpad.json" />
    );
    expect(container).toMatchSnapshot();
    share();
    await tick();
    expect(container.querySelector('.container')).toHaveStyle('height: 267px; width: 400px;');
    expect(container).toMatchSnapshot();
  });

  test('Placed successfully with width and height specified', async () => {
    const { container } = render(
      <div
        kbn-canvas-shareable="canvas"
        kbn-canvas-width="350"
        kbn-canvas-height="350"
        kbn-canvas-url="workpad.json"
      />
    );
    expect(container).toMatchSnapshot();
    share();
    await tick();
    expect(container.querySelector('.container')).toHaveStyle('height: 350px; width: 350px;');
    expect(container).toMatchSnapshot();
  });

  test('Placed successfully with page specified', async () => {
    const { container } = render(
      <div kbn-canvas-shareable="canvas" kbn-canvas-page="0" kbn-canvas-url="workpad.json" />
    );
    expect(container).toMatchSnapshot();
    share();
    await tick();
    expect(container).toMatchSnapshot();
  });
});
