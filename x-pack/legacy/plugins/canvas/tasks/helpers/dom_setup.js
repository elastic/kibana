/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JSDOM } from 'jsdom';
import { APP_ROUTE } from '../../common/lib/constants';
import chrome from '../mocks/uiChrome';

const basePath = chrome.getBasePath();
const basename = `${basePath}${APP_ROUTE}`;

const { window } = new JSDOM('', {
  url: `http://localhost:5601/${basename}`,
  pretendToBeVisual: true,
});

global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.requestAnimationFrame = window.requestAnimationFrame;
global.HTMLElement = window.HTMLElement;
