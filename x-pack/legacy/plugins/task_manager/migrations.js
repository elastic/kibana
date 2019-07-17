/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default {
  task: {
    '7.4.0': (doc) => {
      doc.updated_at = new Date().toISOString();
      return doc;
    }
  }
};
