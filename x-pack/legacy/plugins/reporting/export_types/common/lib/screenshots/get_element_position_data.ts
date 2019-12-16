/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LayoutInstance } from '../../layouts/layout';
import { AttributesMap, ElementsPositionAndAttribute } from './types';

export const getElementPositionAndAttributes = async (
  browser: HeadlessBrowser,
  layout: LayoutInstance
): Promise<ElementsPositionAndAttribute[]> => {
  const elementsPositionAndAttributes: ElementsPositionAndAttribute[] = await browser.evaluate({
    fn: (selector, attributes) => {
      const elements: NodeListOf<Element> = document.querySelectorAll(selector);

      // NodeList isn't an array, just an iterator, unable to use .map/.forEach
      const results: ElementsPositionAndAttribute[] = [];
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const boundingClientRect = element.getBoundingClientRect() as DOMRect;
        results.push({
          position: {
            boundingClientRect: {
              // modern browsers support x/y, but older ones don't
              top: boundingClientRect.y || boundingClientRect.top,
              left: boundingClientRect.x || boundingClientRect.left,
              width: boundingClientRect.width,
              height: boundingClientRect.height,
            },
            scroll: {
              x: window.scrollX,
              y: window.scrollY,
            },
          },
          attributes: Object.keys(attributes).reduce((result: AttributesMap, key) => {
            const attribute = attributes[key];
            result[key] = element.getAttribute(attribute);
            return result;
          }, {}),
        });
      }
      return results;
    },
    args: [layout.selectors.screenshot, { title: 'data-title', description: 'data-description' }],
  });

  if (elementsPositionAndAttributes.length === 0) {
    throw new Error(
      `No shared items containers were found on the page! Reporting requires a container element with the '${layout.selectors.screenshot}' attribute on the page.`
    );
  }

  return elementsPositionAndAttributes;
};
