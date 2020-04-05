/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListItemsElasticType } from './types';
import { Type } from '../routes/schemas/common/schemas';

export const transformListItemsToElasticQuery = ({
  type,
  value,
}: {
  type: Type;
  value: string;
}): ListItemsElasticType => {
  switch (type) {
    case 'ip': {
      return {
        ip: value,
      };
    }
    case 'keyword': {
      return {
        keyword: value,
      };
    }
  }
};
