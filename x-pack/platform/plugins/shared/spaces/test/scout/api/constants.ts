/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SPACES = {
  DEFAULT: {
    spaceId: 'default',
    name: 'Default',
    description: 'This is the default space',
    disabledFeatures: [],
  },
  SPACE_1: {
    spaceId: 'space_1',
    name: 'Space 1',
    description: 'This is the first test space',
    disabledFeatures: [],
  },
  SPACE_2: {
    spaceId: 'space_2',
    name: 'Space 2',
    description: 'This is the second test space',
    disabledFeatures: [],
  },
} as const;

export const ATTRIBUTE_TITLE_KEY = 'title';
export const ATTRIBUTE_TITLE_VALUE = `Test Dashboard`;

export const TEST_SPACES = [SPACES.DEFAULT, SPACES.SPACE_1] as const;

export const DASHBOARD_SAVED_OBJECT = {
  type: 'dashboard',
  attributes: { [ATTRIBUTE_TITLE_KEY]: ATTRIBUTE_TITLE_VALUE },
};

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};
