/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { trunc, map } from 'lodash';
import open from 'opn';
import { parse as parseUrl } from 'url';
import { Page, SerializableOrJSHandle, EvaluateFn } from 'puppeteer';
import { ViewZoomWidthHeight } from '../../../../export_types/common/layouts/layout';
import { LevelLogger } from '../../../../server/lib';
import { allowRequest } from '../../network_policy';
import {
  ConditionalHeaders,
  ConditionalHeadersConditions,
  ElementPosition,
  InterceptedRequest,
  NetworkPolicy,
} from '../../../../types';

export interface ChromiumDriverOptions {
  inspect: boolean;
  networkPolicy: NetworkPolicy;
}

interface WaitForSelectorOpts {
  silent?: boolean;
}

const WAIT_FOR_DELAY_MS: number = 100;

export class HeadlessChromiumDriver {
  private readonly page: Page;
  private readonly inspect: boolean;
  private readonly networkPolicy: NetworkPolicy;

  constructor(page: Page, { inspect, networkPolicy }: ChromiumDriverOptions) {
    this.page = page;
    this.inspect = inspect;
    this.networkPolicy = networkPolicy;
  }

  private allowRequest(url: string) {
    return !this.networkPolicy.enabled || allowRequest(url, this.networkPolicy.rules);
  }

  private truncateUrl(url: string) {
    return trunc(url, {
      length: 100,
      omission: '[truncated]',
    });
  }

  public async open(
    url: string,
    {
      conditionalHeaders,
      waitForSelector,
    }: { conditionalHeaders: ConditionalHeaders; waitForSelector: string },
    logger: LevelLogger
  ) {
    logger.info(`opening url ${url}`);
    // @ts-ignore
    const client = this.page._client;
    let interceptedCount = 0;

    await this.page.setRequestInterception(true);

    // We have to reach into the Chrome Devtools Protocol to apply headers as using
    // puppeteer's API will cause map tile requests to hang indefinitely:
    //    https://github.com/puppeteer/puppeteer/issues/5003
    // Docs on this client/protocol can be found here:
    //    https://chromedevtools.github.io/devtools-protocol/tot/Fetch
    client.on('Fetch.requestPaused', (interceptedRequest: InterceptedRequest) => {
      const {
        requestId,
        request: { url: interceptedUrl },
      } = interceptedRequest;
      const allowed = !interceptedUrl.startsWith('file://');
      const isData = interceptedUrl.startsWith('data:');

      // We should never ever let file protocol requests go through
      if (!allowed || !this.allowRequest(interceptedUrl)) {
        logger.error(`Got bad URL: "${interceptedUrl}", closing browser.`);
        client.send('Fetch.failRequest', {
          errorReason: 'Aborted',
          requestId,
        });
        this.page.browser().close();
        throw new Error(`Received disallowed outgoing URL: "${interceptedUrl}", exiting`);
      }

      if (this._shouldUseCustomHeaders(conditionalHeaders.conditions, interceptedUrl)) {
        logger.debug(`Using custom headers for ${interceptedUrl}`);
        const headers = map(
          {
            ...interceptedRequest.request.headers,
            ...conditionalHeaders.headers,
          },
          (value, name) => ({
            name,
            value,
          })
        );
        client.send('Fetch.continueRequest', {
          requestId,
          headers,
        });
      } else {
        const loggedUrl = isData ? this.truncateUrl(interceptedUrl) : interceptedUrl;
        logger.debug(`No custom headers for ${loggedUrl}`);
        client.send('Fetch.continueRequest', { requestId });
      }
      interceptedCount = interceptedCount + (isData ? 0 : 1);
    });

    // Even though 3xx redirects go through our request
    // handler, we should probably inspect responses just to
    // avoid being bamboozled by some malicious request
    this.page.on('response', interceptedResponse => {
      const interceptedUrl = interceptedResponse.url();
      const allowed = !interceptedUrl.startsWith('file://');

      if (!allowed || !this.allowRequest(interceptedUrl)) {
        logger.error(`Got disallowed URL "${interceptedUrl}", closing browser.`);
        this.page.browser().close();
        throw new Error(`Received disallowed URL in response: ${interceptedUrl}`);
      }
    });

    await this.page.goto(url, { waitUntil: 'domcontentloaded' });

    if (this.inspect) {
      await this.launchDebugger();
    }

    await this.waitForSelector(waitForSelector, {}, logger);
    logger.info(`handled ${interceptedCount} page requests`);
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

  public async waitForSelector(
    selector: string,
    opts: WaitForSelectorOpts = {},
    logger: LevelLogger
  ) {
    const { silent = false } = opts;
    logger.debug(`waitForSelector ${selector}`);

    let resp;
    try {
      resp = await this.page.waitFor(selector);
    } catch (err) {
      if (!silent) {
        // Provide some troubleshooting info to see if we're on the login page,
        // "Kibana could not load correctly", etc
        logger.error(`waitForSelector ${selector} failed on ${this.page.url()}`);
        const pageText = await this.evaluate({
          fn: () => document.querySelector('body')!.innerText,
          args: [],
        });
        logger.debug(`Page plain text: ${pageText.replace(/\n/g, '\\n')}`); // replace newline with escaped for single log line
      }
      throw err;
    }

    logger.debug(`waitForSelector ${selector} resolved`);
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

  public async setViewport({ width, height, zoom }: ViewZoomWidthHeight, logger: LevelLogger) {
    logger.debug(`Setting viewport to width: ${width}, height: ${height}, zoom: ${zoom}`);

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
