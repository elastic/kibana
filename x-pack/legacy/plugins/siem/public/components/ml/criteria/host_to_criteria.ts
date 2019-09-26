/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CriteriaFields } from '../types';
import { HostItem } from '../../../graphql/types';

export const hostToCriteria = (hostItem: HostItem): CriteriaFields[] => {
  if (hostItem.host != null && hostItem.host.name != null) {
    const criteria: CriteriaFields[] = [
      {
        fieldName: 'host.name',
        fieldValue: hostItem.host.name[0],
      },
    ];
    return criteria;
  } else {
    return [];
  }
};
