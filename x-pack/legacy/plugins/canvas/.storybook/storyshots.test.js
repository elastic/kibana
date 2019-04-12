/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import initStoryshots, { multiSnapshotWithOptions } from '@storybook/addon-storyshots';
import styleSheetSerializer from 'jest-styled-components/src/styleSheetSerializer';
import { addSerializer } from 'jest-specific-snapshot'

jest.mock(`@elastic/eui/lib/components/form/form_row/make_id`, () => () => `generated-id`);

addSerializer(styleSheetSerializer);
initStoryshots({
  configPath: path.resolve(__dirname, './../.storybook'),
  test: multiSnapshotWithOptions({}),
});
