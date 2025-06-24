/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Headers, Logger } from '@kbn/core/server';
import {
  KBN_SCREENSHOT_MODE_HEADER,
  ScreenshotModePluginSetup,
} from '@kbn/screenshot-mode-plugin/server';
import { ConfigType } from '@kbn/screenshotting-server';
import { truncate } from 'lodash';
import { ElementHandle, EvaluateFunc, HTTPResponse, Page } from 'puppeteer';
import { Subject } from 'rxjs';
import { parse as parseUrl } from 'url';
import { getDisallowedOutgoingUrlError } from '.';
import { Layout } from '../../layouts';
import { getPrintLayoutSelectors } from '../../layouts/print_layout';
import { allowRequest } from '../network_policy';
import { stripUnsafeHeaders } from './strip_unsafe_headers';
import { getFooterTemplate, getHeaderTemplate } from './templates';

declare module 'puppeteer' {
  interface Page {
    _client(): CDPSession;
  }

  interface Target {
    _targetId: string;
  }
}

export type Context = Record<string, unknown>;

export interface ElementPosition {
  boundingClientRect: {
    // modern browsers support x/y, but older ones don't
    top: number;
    left: number;
    width: number;
    height: number;
  };
  scroll: {
    x: number;
    y: number;
  };
}

interface OpenOptions {
  context?: Context;
  headers: Headers;
  waitForSelector: string;
  timeout: number;
}

interface WaitForSelectorOpts {
  timeout: number;
}

interface EvaluateOpts<A extends unknown[]> {
  fn: EvaluateFunc<A>;
  args: unknown[];
}

interface EvaluateMetaOpts {
  context: string;
}

interface InterceptedRequest {
  requestId: string;
  request: {
    url: string;
    method: string;
    headers: {
      [key: string]: string;
    };
    initialPriority: string;
    referrerPolicy: string;
  };
  frameId: string;
  resourceType: string;
}

const WAIT_FOR_DELAY_MS: number = 100;

/**
 * @internal
 */
export class HeadlessChromiumDriver {
  private listenersAttached = false;
  private interceptedCount = 0;
  private screenshottingErrorSubject = new Subject<Error>();
  readonly screenshottingError$ = this.screenshottingErrorSubject.asObservable();

  constructor(
    private screenshotMode: ScreenshotModePluginSetup,
    private config: ConfigType,
    private basePath: string,
    private readonly page: Page
  ) {}

  private allowRequest(url: string) {
    return !this.config.networkPolicy.enabled || allowRequest(url, this.config.networkPolicy.rules);
  }

  private truncateUrl(url: string) {
    return truncate(url, {
      length: 100,
      omission: '[truncated]',
    });
  }

  /*
   * Call Page.goto and wait to see the Kibana DOM content
   */
  public async open(
    url: string,
    { headers, context, waitForSelector: pageLoadSelector, timeout }: OpenOptions,
    logger: Logger
  ): Promise<void> {
    logger.info(`opening url ${url}`);

    // Reset intercepted request count
    this.interceptedCount = 0;

    /**
     * Integrate with the screenshot mode plugin contract by calling this function before whatever other
     * scripts have run on the browser page.
     */
    await this.page.evaluateOnNewDocument(this.screenshotMode.setScreenshotModeEnabled);

    for (const [key, value] of Object.entries(context ?? {})) {
      await this.page.evaluateOnNewDocument(this.screenshotMode.setScreenshotContext, key, value);
    }

    await this.page.setRequestInterception(true);
    this.registerListeners(url, headers, logger);
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });

    await this.waitForSelector(
      pageLoadSelector,
      { timeout },
      { context: 'waiting for page load selector' },
      logger
    );
    logger.info(`handled ${this.interceptedCount} page requests`);
  }

  /*
   * Let modules poll if Chrome is still running so they can short circuit if needed
   */
  isPageOpen() {
    return !this.page.isClosed();
  }

  /**
   * Despite having "preserveDrawingBuffer": "true" for WebGL driven canvas elements
   * we may still get a blank canvas in PDFs. As a further mitigation
   * we convert WebGL backed canvases to images and inline replace the canvas element.
   * The visual result is identical.
   *
   * The drawback is that we are mutating the page and so if anything were to interact
   * with it after we ran this function it may lead to issues. Ideally, once Chromium
   * fixes how PDFs are generated we can remove this code. See:
   *
   * https://bugs.chromium.org/p/chromium/issues/detail?id=809065
   * https://bugs.chromium.org/p/chromium/issues/detail?id=137576
   *
   * Idea adapted from: https://github.com/puppeteer/puppeteer/issues/1731#issuecomment-864345938
   */
  private async workaroundWebGLDrivenCanvases() {
    const canvases = await this.page.$$('canvas');
    for (const canvas of canvases) {
      await canvas.evaluate((thisCanvas: Element) => {
        if (
          (thisCanvas as HTMLCanvasElement).getContext('webgl') ||
          (thisCanvas as HTMLCanvasElement).getContext('webgl2')
        ) {
          const newDiv = document.createElement('div');
          const img = document.createElement('img');
          img.src = (thisCanvas as HTMLCanvasElement).toDataURL('image/png');
          newDiv.appendChild(img);
          thisCanvas.parentNode!.replaceChild(newDiv, thisCanvas);
        }
      });
    }
  }

  /**
   * Timeout errors may occur when waiting for data or the brower render events to complete. This mutates the
   * page, and has the drawback anything were to interact with the page after we ran this function, it may lead
   * to issues. Ideally, timeout errors wouldn't occur because ES would return pre-loaded results data
   * statically.
   */
  private async injectScreenshottingErrorHeader(error: Error, containerSelector: string) {
    await this.page.evaluate(
      (selector: string, text: string) => {
        let container = document.querySelector(selector);
        if (!container) {
          container = document.querySelector('body');
        }

        const errorBoundary = document.createElement('div');
        errorBoundary.className = 'euiErrorBoundary';

        const divNode = document.createElement('div');
        divNode.className = 'euiCodeBlock euiCodeBlock--fontSmall euiCodeBlock--paddingLarge';

        const preNode = document.createElement('pre');
        preNode.className = 'euiCodeBlock__pre euiCodeBlock__pre--whiteSpacePreWrap';

        const codeNode = document.createElement('code');
        codeNode.className = 'euiCodeBlock__code';

        errorBoundary.appendChild(divNode);
        divNode.appendChild(preNode);
        preNode.appendChild(codeNode);
        codeNode.appendChild(document.createTextNode(text));

        container?.insertBefore(errorBoundary, container.firstChild);
      },
      containerSelector,
      error.toString()
    );
  }

  public async printA4Pdf({
    title,
    logo,
    error,
  }: {
    title: string;
    logo?: string;
    error?: Error;
  }): Promise<Buffer> {
    await this.workaroundWebGLDrivenCanvases();
    if (error) {
      await this.injectScreenshottingErrorHeader(error, getPrintLayoutSelectors().screenshot);
    }
    return Buffer.from(
      await this.page.pdf({
        format: 'a4',
        preferCSSPageSize: true,
        scale: 1,
        landscape: false,
        displayHeaderFooter: true,
        headerTemplate: await getHeaderTemplate({ title }),
        footerTemplate: await getFooterTemplate({ logo }),
      })
    );
  }

  /*
   * Receive a PNG buffer of the page screenshot from Chromium
   */
  public async screenshot({
    elementPosition,
    layout,
    error,
  }: {
    elementPosition: ElementPosition;
    layout: Layout;
    error?: Error;
  }): Promise<Buffer | undefined> {
    if (error) {
      await this.injectScreenshottingErrorHeader(error, layout.selectors.screenshot);
    }

    const { boundingClientRect, scroll } = elementPosition;

    const screenshot = await this.page.screenshot({
      clip: {
        x: boundingClientRect.left + scroll.x,
        y: boundingClientRect.top + scroll.y,
        height: boundingClientRect.height,
        width: boundingClientRect.width,
      },
      captureBeyondViewport: false, // workaround for an internal resize. See: https://github.com/puppeteer/puppeteer/issues/7043
    });

    if (screenshot.byteLength) {
      return Buffer.from(screenshot);
    }

    if (typeof screenshot === 'string') {
      return Buffer.from(screenshot, 'base64');
    }

    return undefined;
  }

  evaluate<A extends unknown[], T = void>(
    { fn, args = [] }: EvaluateOpts<A>,
    meta: EvaluateMetaOpts,
    logger: Logger
  ): Promise<T> {
    logger.debug(`evaluate ${meta.context}`);

    return this.page.evaluate(fn as EvaluateFunc<unknown[]>, ...args) as Promise<T>;
  }

  public async waitForSelector(
    selector: string,
    opts: WaitForSelectorOpts,
    context: EvaluateMetaOpts,
    logger: Logger
  ): Promise<ElementHandle<Element>> {
    const { timeout } = opts;
    logger.debug(`waitForSelector ${selector}`);
    const response = await this.page.waitForSelector(selector, { timeout }); // override default 30000ms

    if (!response) {
      throw new Error(`Failure in waitForSelector: void response! Context: ${context.context}`);
    }

    logger.debug(`waitForSelector ${selector} resolved`);
    return response;
  }

  public async waitFor<T extends unknown[] = unknown[]>({
    fn,
    args,
    timeout,
  }: {
    fn: EvaluateFunc<T>;
    args: unknown[];
    timeout: number;
  }): Promise<void> {
    await this.page.waitForFunction(
      fn as EvaluateFunc<unknown[]>,
      { timeout, polling: WAIT_FOR_DELAY_MS },
      ...args
    );
  }

  /**
   * Setting the viewport is required to ensure that all capture elements are visible: anything not in the
   * viewport can not be captured.
   */
  public async setViewport(
    { width: _width, height: _height, zoom }: { zoom: number; width: number; height: number },
    logger: Logger
  ): Promise<void> {
    const width = Math.floor(_width);
    const height = Math.floor(_height);

    logger.debug(`Setting viewport to: width=${width} height=${height} scaleFactor=${zoom}`);

    await this.page.setViewport({
      width,
      height,
      deviceScaleFactor: zoom,
      isMobile: false,
    });
  }

  private registerListeners(url: string, customHeaders: Headers, logger: Logger) {
    if (this.listenersAttached) {
      return;
    }

    // FIXME: retrieve the client in open() and  pass in the client?
    const client = this.page._client();

    // We have to reach into the Chrome Devtools Protocol to apply headers as using
    // puppeteer's API will cause map tile requests to hang indefinitely:
    //    https://github.com/puppeteer/puppeteer/issues/5003
    // Docs on this client/protocol can be found here:
    //    https://chromedevtools.github.io/devtools-protocol/tot/Fetch
    client.on('Fetch.requestPaused', async (interceptedRequest: InterceptedRequest) => {
      const {
        requestId,
        request: { url: interceptedUrl },
      } = interceptedRequest;

      const allowed = !interceptedUrl.startsWith('file://');
      const isData = interceptedUrl.startsWith('data:');

      // We should never ever let file protocol requests go through
      if (!allowed || !this.allowRequest(interceptedUrl)) {
        await client.send('Fetch.failRequest', {
          errorReason: 'Aborted',
          requestId,
        });
        void this.page.browser().close();
        const error = getDisallowedOutgoingUrlError(interceptedUrl);
        this.screenshottingErrorSubject.next(error);
        logger.error(error);
        return;
      }

      if (this._shouldUseCustomHeaders(url, interceptedUrl)) {
        logger.trace(`Using custom headers for ${interceptedUrl}`);
        const headers = Object.entries({
          ...interceptedRequest.request.headers,
          ...stripUnsafeHeaders(customHeaders),
          [KBN_SCREENSHOT_MODE_HEADER]: 'true',
        }).flatMap(([name, rawValue]) => {
          const values = Array.isArray(rawValue) ? rawValue : [rawValue ?? ''];

          return values.map((value) => ({ name, value }));
        });

        try {
          await client.send('Fetch.continueRequest', {
            requestId,
            headers,
          });
        } catch (err) {
          logger.error(`Failed to complete a request using headers: ${err.message}`);
        }
      } else {
        const loggedUrl = isData ? this.truncateUrl(interceptedUrl) : interceptedUrl;
        logger.trace(`No custom headers for ${loggedUrl}`);
        try {
          await client.send('Fetch.continueRequest', { requestId });
        } catch (err) {
          logger.error(`Failed to complete a request: ${err.message}`);
        }
      }

      this.interceptedCount = this.interceptedCount + (isData ? 0 : 1);
    });

    this.page.on('response', (interceptedResponse: HTTPResponse) => {
      const interceptedUrl = interceptedResponse.url();
      const allowed = !interceptedUrl.startsWith('file://');
      const status = interceptedResponse.status();

      if (status >= 400 && !interceptedResponse.ok()) {
        logger.warn(
          `Chromium received a non-OK response (${status}) for request ${interceptedUrl}`
        );
      }

      if (!allowed || !this.allowRequest(interceptedUrl)) {
        void this.page.browser().close();
        const error = getDisallowedOutgoingUrlError(interceptedUrl);
        this.screenshottingErrorSubject.next(error);
        logger.error(error);
        return;
      }
    });

    this.listenersAttached = true;
  }

  private _shouldUseCustomHeaders(sourceUrl: string, targetUrl: string) {
    const {
      hostname: sourceHostname,
      protocol: sourceProtocol,
      port: sourcePort,
    } = parseUrl(sourceUrl);
    const {
      hostname: targetHostname,
      protocol: targetProtocol,
      port: targetPort,
      pathname: targetPathname,
    } = parseUrl(targetUrl);

    if (targetPathname === null) {
      throw new Error(`URL missing pathname: ${targetUrl}`);
    }

    // `port` is null in URLs that don't explicitly state it,
    // however we can derive the port from the protocol (http/https)
    // IE: https://feeds.elastic.co/kibana/v8.0.0.json
    const derivedPort = (protocol: string | null, port: string | null, url: string) => {
      if (port) {
        return port;
      }

      if (protocol === 'http:') {
        return '80';
      }

      if (protocol === 'https:') {
        return '443';
      }

      throw new Error(`URL missing port: ${url}`);
    };

    return (
      sourceHostname === targetHostname &&
      sourceProtocol === targetProtocol &&
      derivedPort(sourceProtocol, sourcePort, sourceUrl) ===
        derivedPort(targetProtocol, targetPort, targetUrl) &&
      targetPathname.startsWith(`${this.basePath}/`)
    );
  }
}
