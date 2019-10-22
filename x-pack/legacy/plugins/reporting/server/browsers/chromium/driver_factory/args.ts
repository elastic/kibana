/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BrowserConfig } from '../../../../types';

interface LaunchArgs {
  userDataDir: BrowserConfig['userDataDir'];
  viewport: BrowserConfig['viewport'];
  disableSandbox: BrowserConfig['disableSandbox'];
  proxy: BrowserConfig['proxy'];
}

export const args = ({ userDataDir, viewport, disableSandbox, proxy: proxyConfig }: LaunchArgs) => {
  const flags = [
    // Disable built-in Google Translate service
    '--disable-translate',
    // Disable all chrome extensions entirely
    '--disable-extensions',
    // Disable various background network services, including extension updating,
    //   safe browsing service, upgrade detector, translate, UMA
    '--disable-background-networking',
    // Disable fetching safebrowsing lists, likely redundant due to disable-background-networking
    '--safebrowsing-disable-auto-update',
    // Disable syncing to a Google account
    '--disable-sync',
    // Disable reporting to UMA, but allows for collection
    '--metrics-recording-only',
    // Disable installation of default apps on first run
    '--disable-default-apps',
    // Mute any audio
    '--mute-audio',
    // Skip first run wizards
    '--no-first-run',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--headless',
    '--hide-scrollbars',
    `--window-size=${Math.floor(viewport.width)},${Math.floor(viewport.height)}`,
  ];

  if (proxyConfig.enabled) {
    flags.push(`--proxy-server=${proxyConfig.server}`);
    if (proxyConfig.bypass) {
      flags.push(`--proxy-bypass-list=${proxyConfig.bypass.join(',')}`);
    }
  }

  if (disableSandbox) {
    flags.push('--no-sandbox');
  }

  // log to chrome_debug.log
  flags.push('--enable-logging');
  flags.push('--v=1');

  if (process.platform === 'linux') {
    flags.push('--disable-setuid-sandbox');
  }

  return [...flags, 'about:blank'];
};
