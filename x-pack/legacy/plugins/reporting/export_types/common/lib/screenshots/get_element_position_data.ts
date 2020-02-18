/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { LayoutInstance } from '../../layouts/layout';
import { AttributesMap, ElementsPositionAndAttribute } from './types';
import { Logger } from '../../../../types';
import { CONTEXT_ELEMENTATTRIBUTES } from './constants';

export const getElementPositionAndAttributes = async (
  browser: HeadlessBrowser,
  layout: LayoutInstance,
  logger: Logger
): Promise<ElementsPositionAndAttribute[]> => {
  const elementsPositionAndAttributes: ElementsPositionAndAttribute[] = await browser.evaluate(
    {
      fn: (selector: string, attributes: any) => {
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
              (result as any)[key] = element.getAttribute(attribute);
              return result;
            }, {} as AttributesMap),
          });
        }
        return results;
      },
      args: [layout.selectors.screenshot, { title: 'data-title', description: 'data-description' }],
    },
    { context: CONTEXT_ELEMENTATTRIBUTES },
    logger
  );

  if (elementsPositionAndAttributes.length === 0) {
    throw new Error(
      `No shared items containers were found on the page! Reporting requires a container element with the '${layout.selectors.screenshot}' attribute on the page.`
    );
  }

  return elementsPositionAndAttributes;
};
