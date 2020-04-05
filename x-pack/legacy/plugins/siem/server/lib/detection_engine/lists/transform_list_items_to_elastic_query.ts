/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListItemsElasticType } from './types';

export const transformListItemsToElasticQuery = ({
  type,
  value,
}: {
  type: string; // TODO Change this to an enum
  value: string;
}): ListItemsElasticType => {
  switch (type) {
    case 'ip': {
      return {
        ip: value,
      };
    }
    case 'string': {
      return {
        string: value,
      };
    }
    default: {
      // TODO: Once we use an enum this should go away
      throw new Error('Default should not be reached');
    }
  }
};
