/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const platformArchives = {
  darwin: {
    directoryName: 'headless_shell-darwin',
    files: [
      'headless_shell',
      'natives_blob.bin',
      'snapshot_blob.bin',
      'Helpers/crashpad_handler'
    ]
  },
  linux: {
    directoryName: 'headless_shell-linux',
    files: [
      'headless_shell'
    ]
  },
  win32: {
    directoryName: 'headless_shell-win32',
    files: [
      'dbghelp.dll',
      'headless_shell.exe',
      'icudtl.dat',
      'natives_blob.bin',
      'snapshot_blob.bin',
    ]
  }
};