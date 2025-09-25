/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { adhocDataViewSchema, mapAttributesSchema } from './map_attributes_schema';

/**
 * Shape of map attributes in REST APIs
 */
export type MapAttributes = TypeOf<typeof mapAttributesSchema>;

export type AdhocDataView = TypeOf<typeof adhocDataViewSchema>;
