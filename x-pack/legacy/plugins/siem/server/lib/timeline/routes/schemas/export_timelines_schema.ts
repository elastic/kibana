/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';

const ids = runtimeTypes.array(runtimeTypes.string);
export const exportTimelinesSchema = runtimeTypes.type({ ids });

export const exportTimelinesQuerySchema = runtimeTypes.type({
  file_name: runtimeTypes.string,
  exclude_export_details: runtimeTypes.boolean,
});
