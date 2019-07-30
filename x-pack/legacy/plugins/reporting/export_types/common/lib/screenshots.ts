/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { first, tap, mergeMap } from 'rxjs/operators';
import fs from 'fs';
import { promisify } from 'util';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../../common/constants';
import { LevelLogger } from '../../../server/lib/level_logger';
import { PLUGIN_ID } from '../../../common/constants';
import { LevelLogger } from '../../../server/lib/level_logger';
import { KbnServer, ElementPosition } from '../../../types';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../server/browsers/chromium/driver';
import { Layout, LayoutInstance } from '../layouts/layout';
import { HeadlessChromiumDriverFactory } from '../../../server/browsers/chromium/driver_factory';

interface TimeRange {
  from: any;
  to: any;
}

interface AttributesMap {
  [key: string]: any;
}

interface ElementsPositionAndAttribute {
  position: ElementPosition;
  attributes: AttributesMap;
}

interface ScreenShotOpts {
  browser: HeadlessBrowser;
  elementsPositionAndAttributes: ElementsPositionAndAttribute[];
}

interface Screenshot {
  base64EncodedData: any;
  title: any;
  description: any;
}

interface TimeRangeOpts {
  timeRange: TimeRange;
}

const fsp = { readFile: promisify(fs.readFile) };

export function screenshotsObservableFactory(server: KbnServer) {
  const config = server.config();
  const logger = LevelLogger.createForServer(server, [PLUGIN_ID, 'screenshots']);

  const browserDriverFactory: HeadlessChromiumDriverFactory =
    server.plugins.reporting.browserDriverFactory;
  const captureConfig = config.get('xpack.reporting.capture');

  const asyncDurationLogger = async (description: string, promise: Promise<any>) => {
    const start = new Date().valueOf();
    const result = await promise;
    logger.debug(`${description} took ${new Date().valueOf() - start}ms`);
    return result;
  };

  const openUrl = async (browser: HeadlessBrowser, url: string, conditionalHeaders: any) => {
    const waitForSelector = '.application';

    await browser.open(url, {
      conditionalHeaders,
      waitForSelector,
    });
  };

  const injectCustomCss = async (browser: HeadlessBrowser, layout: Layout) => {
    const filePath = layout.getCssOverridesPath();
    const buffer = await fsp.readFile(filePath);
    await browser.evaluate({
      fn: css => {
        const node = document.createElement('style');
        node.type = 'text/css';
        node.innerHTML = css; // eslint-disable-line no-unsanitized/property
        document.getElementsByTagName('head')[0].appendChild(node);
      },
      args: [buffer.toString()],
    });
  };

  const waitForElementOrItemsCountAttribute = async (
    browser: HeadlessBrowser,
    layout: LayoutInstance
  ) => {
    // the dashboard is using the `itemsCountAttribute` attribute to let us
    // know how many items to expect since gridster incrementally adds panels
    // we have to use this hint to wait for all of them
    await browser.waitForSelector(
      `${layout.selectors.renderComplete},[${layout.selectors.itemsCountAttribute}]`
    );
  };

  const checkForToastMessage = async (browser: HeadlessBrowser, layout: LayoutInstance) => {
    await browser.waitForSelector(layout.selectors.toastHeader, { silent: true });
    const toastHeaderText = await browser.evaluate({
      fn: selector => {
        const nodeList = document.querySelectorAll(selector);
        return nodeList.item(0).innerText;
      },
      args: [layout.selectors.toastHeader],
    });
    throw new Error(
      i18n.translate(
        'xpack.reporting.exportTypes.printablePdf.screenshots.unexpectedErrorMessage',
        {
          defaultMessage: 'Encountered an unexpected message on the page: {toastHeaderText}',
          values: { toastHeaderText },
        }
      )
    );
  };

  const getNumberOfItems = async (browser: HeadlessBrowser, layout: LayoutInstance) => {
    // returns the value of the `itemsCountAttribute` if it's there, otherwise
    // we just count the number of `itemSelector`
    const itemsCount = await browser.evaluate({
      fn: (selector, countAttribute) => {
        const elementWithCount = document.querySelector(`[${countAttribute}]`);
        if (elementWithCount && elementWithCount != null) {
          const count = elementWithCount.getAttribute(countAttribute);
          if (count && count != null) {
            return parseInt(count, 10);
          }
        }

        return document.querySelectorAll(selector).length;
      },
      args: [layout.selectors.renderComplete, layout.selectors.itemsCountAttribute],
    });
    return itemsCount;
  };

  const waitForElementsToBeInDOM = async (
    browser: HeadlessBrowser,
    itemsCount: number,
    layout: LayoutInstance
  ) => {
    await browser.waitFor({
      fn: selector => {
        return document.querySelectorAll(selector).length;
      },
      args: [layout.selectors.renderComplete],
      toEqual: itemsCount,
    });
  };

  const setViewport = async (
    browser: HeadlessBrowser,
    itemsCount: number,
    layout: LayoutInstance
  ) => {
    const viewport = layout.getViewport(itemsCount);
    await browser.setViewport(viewport);
  };

  const positionElements = async (browser: HeadlessBrowser, layout: LayoutInstance) => {
    if (layout.positionElements) {
      // print layout
      await layout.positionElements(browser);
    }
  };

  const waitForRenderComplete = async (browser: HeadlessBrowser, layout: LayoutInstance) => {
    await browser.evaluate({
      fn: (selector, visLoadDelay) => {
        // wait for visualizations to finish loading
        const visualizations: NodeListOf<Element> = document.querySelectorAll(selector);
        const visCount = visualizations.length;
        const renderedTasks = [];

        function waitForRender(visualization: Element) {
          return new Promise(resolve => {
            visualization.addEventListener('renderComplete', () => resolve());
          });
        }

        function waitForRenderDelay() {
          return new Promise(resolve => {
            setTimeout(resolve, visLoadDelay);
          });
        }

        for (let i = 0; i < visCount; i++) {
          const visualization = visualizations[i];
          const isRendered = visualization.getAttribute('data-render-complete');

          if (isRendered === 'disabled') {
            renderedTasks.push(waitForRenderDelay());
          } else if (isRendered === 'false') {
            renderedTasks.push(waitForRender(visualization));
          }
        }

        // The renderComplete fires before the visualizations are in the DOM, so
        // we wait for the event loop to flush before telling reporting to continue. This
        // seems to correct a timing issue that was causing reporting to occasionally
        // capture the first visualization before it was actually in the DOM.
        // Note: 100 proved too short, see https://github.com/elastic/kibana/issues/22581,
        // bumping to 250.
        const hackyWaitForVisualizations = () => new Promise(r => setTimeout(r, 250));

        return Promise.all(renderedTasks).then(hackyWaitForVisualizations);
      },
      args: [layout.selectors.renderComplete, captureConfig.loadDelay],
    });
  };

  const getTimeRange = async (
    browser: HeadlessBrowser,
    layout: LayoutInstance
  ): Promise<TimeRange | null> => {
    const timeRange: TimeRange | null = await browser.evaluate({
      fn: (fromAttribute, toAttribute) => {
        const fromElement = document.querySelector(`[${fromAttribute}]`);
        const toElement = document.querySelector(`[${toAttribute}]`);

        if (!fromElement || !toElement) {
          return null;
        }

        const from = fromElement.getAttribute(fromAttribute);
        const to = toElement.getAttribute(toAttribute);
        if (!to || !from) {
          return null;
        }

        return { from, to };
      },
      args: [layout.selectors.timefilterFromAttribute, layout.selectors.timefilterToAttribute],
    });
    return timeRange;
  };

  const getElementPositionAndAttributes = async (
    browser: HeadlessBrowser,
    layout: LayoutInstance
  ): Promise<ElementsPositionAndAttribute[]> => {
    const elementsPositionAndAttributes = await browser.evaluate({
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
    return elementsPositionAndAttributes;
  };

  const getScreenshots = async ({
    browser,
    elementsPositionAndAttributes,
  }: ScreenShotOpts): Promise<Screenshot[]> => {
    const screenshots = [];
    for (const item of elementsPositionAndAttributes) {
      const base64EncodedData = await asyncDurationLogger(
        'screenshot',
        browser.screenshot(item.position)
      );

      screenshots.push({
        base64EncodedData,
        title: item.attributes.title,
        description: item.attributes.description,
      });
    }
    return screenshots;
  };

  return function screenshotsObservable(
    url: string,
    conditionalHeaders: any,
    layout: LayoutInstance,
    browserTimezone: string
  ): Rx.Observable<void> {
    logger.debug(`Creating browser driver factory`);

    const create$ = browserDriverFactory.create({
      viewport: layout.getBrowserViewport(),
      browserTimezone,
    });

    return create$.pipe(
      mergeMap(({ driver$, exit$, message$, consoleMessage$ }) => {
        logger.debug('Driver factory created');
        message$.subscribe((line: string) => {
          logger.debug(line, ['browser']);
        });

        consoleMessage$.subscribe((line: string) => {
          logger.debug(line, ['browserConsole']);
        });

        const screenshot$ = driver$.pipe(
          tap(() => logger.debug(`opening ${url}`)),
          mergeMap(
            (browser: HeadlessBrowser) => openUrl(browser, url, conditionalHeaders),
            browser => browser
          ),
          tap(() =>
            logger.debug('waiting for elements or items count attribute; or not found to interrupt')
          ),
          mergeMap(
            (browser: HeadlessBrowser) =>
              Rx.race(
                Rx.from(waitForElementOrItemsCountAttribute(browser, layout)),
                Rx.from(checkForToastMessage(browser, layout))
              ),
            browser => browser
          ),
          tap(() => logger.debug('determining how many items we have')),
          mergeMap(
            (browser: HeadlessBrowser) => getNumberOfItems(browser, layout),
            (browser, itemsCount) => ({ browser, itemsCount })
          ),
          tap(() => logger.debug('setting viewport')),
          mergeMap(
            ({ browser, itemsCount }) => setViewport(browser, itemsCount, layout),
            ({ browser, itemsCount }) => ({ browser, itemsCount })
          ),
          tap(({ itemsCount }) => logger.debug(`waiting for ${itemsCount} to be in the DOM`)),
          mergeMap(
            ({ browser, itemsCount }) => waitForElementsToBeInDOM(browser, itemsCount, layout),
            ({ browser, itemsCount }) => ({ browser, itemsCount })
          ),
          // Waiting till _after_ elements have rendered before injecting our CSS
          // allows for them to be displayed properly in many cases
          tap(() => logger.debug('injecting custom css')),
          mergeMap(
            ({ browser }) => injectCustomCss(browser, layout),
            ({ browser }) => ({ browser })
          ),
          tap(() => logger.debug('positioning elements')),
          mergeMap(({ browser }) => positionElements(browser, layout), ({ browser }) => browser),
          tap(() => logger.debug('waiting for rendering to complete')),
          mergeMap(
            (browser: HeadlessBrowser) => waitForRenderComplete(browser, layout),
            browser => browser
          ),
          tap(() => logger.debug('rendering is complete')),
          mergeMap(
            (browser: HeadlessBrowser) => getTimeRange(browser, layout),
            (browser, timeRange) => ({ browser, timeRange })
          ),
          tap(({ timeRange }) =>
            logger.debug(
              timeRange ? `timeRange from ${timeRange.from} to ${timeRange.to}` : 'no timeRange'
            )
          ),
          mergeMap(
            ({ browser }) => getElementPositionAndAttributes(browser, layout),
            (
              { browser, timeRange }: { browser: HeadlessBrowser; timeRange: any },
              elementsPositionAndAttributes: ElementsPositionAndAttribute[]
            ) => {
              return { browser, timeRange, elementsPositionAndAttributes };
            }
          ),
          tap(() => logger.debug(`taking screenshots`)),
          mergeMap(
            ({ browser, elementsPositionAndAttributes }: ScreenShotOpts & TimeRangeOpts) =>
              getScreenshots({ browser, elementsPositionAndAttributes }),
            ({ timeRange }, screenshots) => ({ timeRange, screenshots })
          )
        );

        return Rx.race(screenshot$, exit$);
      }),
      first()
    );
  };
}
