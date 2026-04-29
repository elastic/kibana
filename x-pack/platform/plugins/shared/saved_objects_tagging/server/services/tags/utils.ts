/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tag, TagSavedObject } from '../../../common/types';

export const savedObjectToTag = (savedObject: TagSavedObject): Tag => {
  return {
    id: savedObject.id,
    managed: Boolean(savedObject.managed),
    ...savedObject.attributes,
  };
};
