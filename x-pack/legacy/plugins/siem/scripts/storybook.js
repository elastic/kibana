/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line
require('@kbn/storybook').runStorybookCli({
  name: 'siem',
  storyGlobs: ['x-pack/legacy/plugins/siem/public/components/**/*.examples.tsx'],
});
