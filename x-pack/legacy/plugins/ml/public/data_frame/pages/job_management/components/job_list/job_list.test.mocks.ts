/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chromeServiceMock } from '../../../../../../../../../../src/core/public/mocks';

jest.doMock('ui/new_platform', () => ({
  npStart: {
    core: {
      chrome: chromeServiceMock.createStartContract(),
    },
  },
}));
