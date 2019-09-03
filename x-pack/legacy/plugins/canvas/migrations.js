/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CANVAS_TYPE } from './common/lib';

export const migrations = {
  [CANVAS_TYPE]: {
    '7.0.0': doc => {
      if (doc.attributes) {
        delete doc.attributes.id;
      }
      return doc;
    },
  },
};
