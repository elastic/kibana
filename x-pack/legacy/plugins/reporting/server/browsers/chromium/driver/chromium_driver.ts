/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import open from 'opn';
import { Page, SerializableOrJSHandle, EvaluateFn } from 'puppeteer';
import { parse as parseUrl } from 'url';
import { ViewZoomWidthHeight } from '../../../../export_types/common/layouts/layout';
import {
  ConditionalHeaders,
  ConditionalHeadersConditions,
  ElementPosition,
  Logger,
} from '../../../../types';

export interface ChromiumDriverOptions {
  logger: Logger;
  inspect: boolean;
}

interface WaitForSelectorOpts {
  silent?: boolean;
}

const WAIT_FOR_DELAY_MS: number = 100;

export class HeadlessChromiumDriver {
  private readonly page: Page;
  private readonly logger: Logger;
  private readonly inspect: boolean;

  constructor(page: Page, { logger, inspect }: ChromiumDriverOptions) {
    this.page = page;
    // @ts-ignore https://github.com/elastic/kibana/issues/32140
    this.logger = logger.clone(['headless-chromium-driver']);
    this.inspect = inspect;
  }

  public async open(
    url: string,
    {
      conditionalHeaders,
      waitForSelector,
    }: { conditionalHeaders: ConditionalHeaders; waitForSelector: string }
  ) {
    this.logger.info(`opening url ${url}`);
    await this.page.setRequestInterception(true);
    let interceptedCount = 0;
    this.page.on('request', (interceptedRequest: any) => {
      let isData = false;
      if (this._shouldUseCustomHeaders(conditionalHeaders.conditions, interceptedRequest.url())) {
        this.logger.debug(`Using custom headers for ${interceptedRequest.url()}`);
        interceptedRequest.continue({
          headers: {
            ...interceptedRequest.headers(),
            ...conditionalHeaders.headers,
          },
        });
      } else {
        let interceptedUrl = interceptedRequest.url();

        if (interceptedUrl.startsWith('data:')) {
          // `data:image/xyz;base64` can be very long URLs
          interceptedUrl = interceptedUrl.substring(0, 100) + '[truncated]';
          isData = true;
        }

        this.logger.debug(`No custom headers for ${interceptedUrl}`);
        interceptedRequest.continue();
      }
      interceptedCount = interceptedCount + (isData ? 0 : 1);
    });

    await this.page.goto(url, { waitUntil: 'domcontentloaded' });

    if (this.inspect) {
      await this.launchDebugger();
    }

    await this.waitForSelector(waitForSelector);
    this.logger.info(`handled ${interceptedCount} page requests`);
  }

  public async screenshot(elementPosition: ElementPosition) {
    let clip;
    if (elementPosition) {
      const { boundingClientRect, scroll = { x: 0, y: 0 } } = elementPosition;
      clip = {
        x: boundingClientRect.left + scroll.x,
        y: boundingClientRect.top + scroll.y,
        height: boundingClientRect.height,
        width: boundingClientRect.width,
      };
    }

    const screenshot = await this.page.screenshot({
      clip,
    });

    return screenshot.toString('base64');
  }

  public async evaluate({ fn, args = [] }: { fn: EvaluateFn; args: SerializableOrJSHandle[] }) {
    const result = await this.page.evaluate(fn, ...args);
    return result;
  }

  public async waitForSelector(selector: string, opts: WaitForSelectorOpts = {}) {
    const { silent = false } = opts;
    this.logger.debug(`waitForSelector ${selector}`);

    let resp;
    try {
      resp = await this.page.waitFor(selector);
    } catch (err) {
      if (!silent) {
        // Provide some troubleshooting info to see if we're on the login page,
        // "Kibana could not load correctly", etc
        this.logger.error(`waitForSelector ${selector} failed on ${this.page.url()}`);
        const pageText = await this.evaluate({
          fn: () => document.querySelector('body')!.innerText,
          args: [],
        });
        this.logger.debug(`Page plain text: ${pageText.replace(/\n/g, '\\n')}`); // replace newline with escaped for single log line
      }
      throw err;
    }

    this.logger.debug(`waitForSelector ${selector} resolved`);
    return resp;
  }

  public async waitFor<T>({
    fn,
    args,
    toEqual,
  }: {
    fn: EvaluateFn;
    args: SerializableOrJSHandle[];
    toEqual: T;
  }) {
    while (true) {
      const result = await this.evaluate({ fn, args });
      if (result === toEqual) {
        return;
      }

      await new Promise(r => setTimeout(r, WAIT_FOR_DELAY_MS));
    }
  }

  public async setViewport({ width, height, zoom }: ViewZoomWidthHeight) {
    this.logger.debug(`Setting viewport to width: ${width}, height: ${height}, zoom: ${zoom}`);

    await this.page.setViewport({
      width: Math.floor(width / zoom),
      height: Math.floor(height / zoom),
      deviceScaleFactor: zoom,
      isMobile: false,
    });
  }

  private async launchDebugger() {
    // In order to pause on execution we have to reach more deeply into Chromiums Devtools Protocol,
    // and more specifically, for the page being used. _client is per-page, and puppeteer doesn't expose
    // a page's client in their api, so we have to reach into internals to get this behavior.
    // Finally, in order to get the inspector running, we have to know the page's internal ID (again, private)
    // in order to construct the final debugging URL.

    // @ts-ignore
    await this.page._client.send('Debugger.enable');
    // @ts-ignore
    await this.page._client.send('Debugger.pause');
    // @ts-ignore
    const targetId = this.page._target._targetId;
    const wsEndpoint = this.page.browser().wsEndpoint();
    const { port } = parseUrl(wsEndpoint);

    open(
      `http://localhost:${port}/devtools/inspector.html?ws=localhost:${port}/devtools/page/${targetId}`
    );
  }

  private _shouldUseCustomHeaders(conditions: ConditionalHeadersConditions, url: string) {
    const { hostname, protocol, port, pathname } = parseUrl(url);

    if (pathname === undefined) {
      // There's a discrepancy between the NodeJS docs and the typescript types. NodeJS docs
      // just say 'string' and the typescript types say 'string | undefined'. We haven't hit a
      // situation where it's undefined but here's an explicit Error if we do.
      throw new Error(`pathname is undefined, don't know how to proceed`);
    }

    return (
      hostname === conditions.hostname &&
      protocol === `${conditions.protocol}:` &&
      this._shouldUseCustomHeadersForPort(conditions, port) &&
      pathname.startsWith(`${conditions.basePath}/`)
    );
  }

  private _shouldUseCustomHeadersForPort(
    conditions: ConditionalHeadersConditions,
    port: string | undefined
  ) {
    if (conditions.protocol === 'http' && conditions.port === 80) {
      return (
        port === undefined || port === null || port === '' || port === conditions.port.toString()
      );
    }

    if (conditions.protocol === 'https' && conditions.port === 443) {
      return (
        port === undefined || port === null || port === '' || port === conditions.port.toString()
      );
    }

    return port === conditions.port.toString();
  }
}
