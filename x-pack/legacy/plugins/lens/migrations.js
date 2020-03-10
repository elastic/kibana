/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const migrations = {
  lens: {
    '7.7.0': doc => {
      if (!doc.attributes) {
        return doc;
      }
      const visible = doc.attributes.visible;
      // visible already has a value
      if (visible !== undefined) {
        return doc;
      }
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          visible: true,
        },
      };
    },
  },
};
