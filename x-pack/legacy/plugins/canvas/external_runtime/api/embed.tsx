/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { App } from '../components/app';
import { CanvasRenderedWorkpad } from '../types';

export interface Options {
  /** The preferred height to scale the embedded workpad.  If only `height` is
   * specified, `width` will be calculated by the workpad ratio.  If both are
   * specified, the ratio will be overriden by an absolute size. */
  height?: number;
  /** The preferred width to scale the embedded workpad.  If only `width` is
   * specified, `height` will be calculated by the workpad ratio.  If both are
   * specified, the ratio will be overriden by an absolute size. */
  width?: number;
  /** The initial page to display. */
  page?: number;
}

const PREFIX = 'kbn-canvas';
const EMBED = `${PREFIX}-embed`;

const getAttributes = (element: Element, attributes: string[]) => {
  const result: { [key: string]: string } = {};
  attributes.forEach(attribute => {
    const key = `${PREFIX}-${attribute}`;
    const value = element.getAttribute(key);

    if (value) {
      result[attribute] = value;
      element.removeAttribute(key);
    }
  });

  return result;
};

const getWorkpad = async (url: string): Promise<CanvasRenderedWorkpad | null> => {
  const workpadResponse = await fetch(url);

  if (workpadResponse.ok) {
    return await workpadResponse.json();
  }

  return null;
};

const updateArea = async (area: Element) => {
  const { url, page: pageAttr, height: heightAttr, weight: widthAttr } = getAttributes(area, [
    'url',
    'page',
    'height',
    'width',
  ]);

  if (url) {
    const workpad = await getWorkpad(url);

    if (workpad) {
      const page = pageAttr ? parseInt(pageAttr, 10) : null;
      let height = heightAttr ? parseInt(heightAttr, 10) : null;
      let width = widthAttr ? parseInt(widthAttr, 10) : null;

      if (height && !width) {
        // If we have a height but no width, the width should honor the workpad ratio.
        width = workpad.width * (height / workpad.height);
      } else if (width && !height) {
        // If we have a width but no height, the height should honor the workpad ratio.
        height = workpad.height * (width / workpad.width);
      }

      const options = {
        height: height || workpad.height,
        width: width || workpad.width,
        page: page ? page : workpad.page,
      };

      area.classList.add('kbnCanvas');
      area.removeAttribute(EMBED);

      render(<App workpad={workpad} {...options} />, area);
    }
  }
};

/**
 * This is an abstract embedding component.  It provides all of the scaling and
 * other option handling for embedding strategies.
 */
export const embed = () => {
  const embedAreas = document.querySelectorAll(`[${EMBED}]`);
  const validAreas = Array.from(embedAreas).filter(area => area.getAttribute(EMBED) === 'canvas');

  validAreas.forEach(updateArea);
};
