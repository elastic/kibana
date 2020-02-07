/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

// TODO:
// Until we can process SCSS in new platform, this part of Searchprofiler
// legacy must remain here.

export const searchprofiler = (kibana: any) => {
  const publicSrc = resolve(__dirname, 'public');

  return new kibana.Plugin({
    require: ['elasticsearch', 'xpack_main'],
    id: 'searchprofiler',
    configPrefix: 'xpack.searchprofiler',
    publicDir: publicSrc,

    uiExports: {
      styleSheetPaths: `${publicSrc}/index.scss`,
    },
    init() {},
  });
};
