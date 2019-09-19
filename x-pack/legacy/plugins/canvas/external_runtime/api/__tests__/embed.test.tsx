/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { snapshots, tick } from '../../test';
import { embed } from '../embed';

jest.mock('../../supported_renderers');

describe('Embed API', () => {
  beforeEach(function() {
    // @ts-ignore Applying a global in Jest is alright.
    global.fetch = jest.fn().mockImplementation(() => {
      const p = new Promise((resolve, _reject) => {
        resolve({
          ok: true,
          json: () => {
            return snapshots.hello;
          },
        });
      });
      return p;
    });
  });

  test('Embeds successfully with default properties', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const wrapper = mount(<div kbn-canvas-embed="canvas" kbn-canvas-url="workpad.json"></div>, {
      attachTo: container,
    });

    expect(wrapper.html()).toMatchSnapshot();
    embed();
    await tick();
    expect(wrapper.html()).toMatchSnapshot();
  });

  test('Embeds successfully with height specified', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const wrapper = mount(
      <div kbn-canvas-embed="canvas" kbn-canvas-height="350" kbn-canvas-url="workpad.json"></div>,
      {
        attachTo: container,
      }
    );

    expect(wrapper.html()).toMatchSnapshot();
    embed();
    await tick();
    expect(wrapper.html()).toMatch(
      /<div class=\"container\" style="height: 350px; width: 525px;\">/
    );
    expect(wrapper.html()).toMatchSnapshot();
  });

  test('Embeds successfully with width specified', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const wrapper = mount(
      <div kbn-canvas-embed="canvas" kbn-canvas-width="400" kbn-canvas-url="workpad.json"></div>,
      {
        attachTo: container,
      }
    );

    expect(wrapper.html()).toMatchSnapshot();
    embed();
    await tick();
    expect(wrapper.html()).toMatch(
      /<div class=\"container\" style="height: 267px; width: 400px;\">/
    );
    expect(wrapper.html()).toMatchSnapshot();
  });

  test('Embeds successfully with width and height specified', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const wrapper = mount(
      <div
        kbn-canvas-embed="canvas"
        kbn-canvas-width="350"
        kbn-canvas-height="350"
        kbn-canvas-url="workpad.json"
      ></div>,
      {
        attachTo: container,
      }
    );

    expect(wrapper.html()).toMatchSnapshot();
    embed();
    await tick();
    expect(wrapper.html()).toMatch(
      /<div class=\"container\" style="height: 350px; width: 350px;\">/
    );
    expect(wrapper.html()).toMatchSnapshot();
  });

  test('Embeds successfully with page specified', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const wrapper = mount(
      <div kbn-canvas-embed="canvas" kbn-canvas-page="0" kbn-canvas-url="workpad.json"></div>,
      {
        attachTo: container,
      }
    );

    expect(wrapper.html()).toMatchSnapshot();
    embed();
    await tick();
    expect(wrapper.html()).toMatchSnapshot();
  });
});
