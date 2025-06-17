/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { mapAttributesSchema, mapsGetResultSchema } from './cm_services';

export type MapsSavedObjectAttributes = TypeOf<typeof mapAttributesSchema>;
export type MapsGetOut = TypeOf<typeof mapsGetResultSchema>;
