/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import moment from 'moment-timezone';

import initStoryshots, { multiSnapshotWithOptions } from '@storybook/addon-storyshots';
import styleSheetSerializer from 'jest-styled-components/src/styleSheetSerializer';
import { addSerializer } from 'jest-specific-snapshot';
import './mocks';

// Set our default timezone to UTC for tests so we can generate predictable snapshots
moment.tz.setDefault('UTC');

// Freeze time for the tests for predictable snapshots
const testTime = new Date(Date.UTC(2019, 5, 1)).valueOf(); // June 1 2019
Date.now = jest.fn(() => testTime);

addSerializer(styleSheetSerializer);

// Initialize Storyshots and build the Jest Snapshots
initStoryshots({
  configPath: path.resolve(__dirname, './../.storybook'),
  test: multiSnapshotWithOptions({
    createNodeMock: element => {
      if (element.type === 'code') {
        return document.createElement('code');
      }
    },
  }),
});
