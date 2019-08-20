/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { dateAsString } from '../../common/runtime_types/date_as_string';

export const rangeRt = t.type({
  start: dateAsString,
  end: dateAsString
});

export const uiFiltersRt = t.type({ uiFilters: t.string });

export const debugRt = t.partial({ debug: t.boolean });
