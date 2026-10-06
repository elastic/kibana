/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Logical mapping field name the dataset API reads to enable time filtering. */
export const TIMESTAMP_LOGICAL_FIELD_NAME = '@timestamp';

/** Stable mapping editor field id for the timestamp field managed by the timeseries section. */
export const TIMESTAMP_FIELD_ID = '__timestamp__';
