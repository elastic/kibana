/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_GROUP_BY_FIELD } from '../../../common/lib';
import { FilterField, State } from '../../../types';

export const getGroupFiltersByOption = (state: State): FilterField => {
  return state.transient.sidebar.groupFiltersByOption ?? DEFAULT_GROUP_BY_FIELD;
};
