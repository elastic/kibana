/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

export const paths = {
  archivesPath: path.resolve(__dirname, '../../../.chromium'),
  baseUrl: 'https://s3.amazonaws.com/headless-shell/',
  packages: [{
    platforms: ['darwin', 'freebsd', 'openbsd'],
    archiveFilename: 'chromium-2fac04a-darwin.zip',
    archiveChecksum: '36814b1629457aa178b4ecdf6cc1bc5f',
    rawChecksum: '9b40e2efa7f4f1870835ee4cdaf1dd51',
    binaryRelativePath: 'headless_shell-darwin/headless_shell',
  }, {
    platforms: ['linux'],
    archiveFilename: 'chromium-2fac04a-linux.zip',
    archiveChecksum: '5cd6b898a35f9dc0ba6f49d821b8a2a3',
    rawChecksum: 'b3fd218d3c3446c388da4e6c8a82754c',
    binaryRelativePath: 'headless_shell-linux/headless_shell'
  }, {
    platforms: ['win32'],
    archiveFilename: 'chromium-2fac04a-windows.zip',
    archiveChecksum: '1499a4d5847792d59b9c1a8ab7dc8b94',
    rawChecksum: '08b48d2f3d23c4bc8b58779ca4a7b627',
    binaryRelativePath: 'headless_shell-windows\\headless_shell.exe'
  }]
};

export const getChromeLogLocation = (binaryPath) =>
  path.join(binaryPath, '..', 'chrome_debug.log');
