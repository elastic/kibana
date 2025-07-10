/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';

export const getDataviewReferences = (dataViewId: string | undefined, refName: string) => {
  const references: Reference[] = dataViewId
    ? [
        {
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
          name: refName,
          id: dataViewId,
        },
      ]
    : [];
  return references;
};
