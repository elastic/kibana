/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import puppeteer from 'puppeteer';
// @ts-ignore lacking typedefs which this module fixes
import puppeteerCore from 'puppeteer-core';

// We export a set of types and other methods since we use puppeteer-core, which has an outdated @types package.
// However, @types/puppeteer _is_ up-to-date, and this module merges them together.
export type Browser = puppeteer.Browser;
export type Page = puppeteer.Page;

export const launch: (
  opts?: puppeteer.LaunchOptions
) => Promise<puppeteer.Browser> = puppeteerCore.launch.bind(puppeteerCore);
