/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ITEM_VERSION_V1 } from './v1/constants';

export { LENS_ITEM_VERSION_V1 } from './v1/constants';

/**
 * Latest Lens CM Item Version
 */
export const LENS_ITEM_LATEST_VERSION = LENS_ITEM_VERSION_V1;
export type LENS_ITEM_LATEST_VERSION = typeof LENS_ITEM_LATEST_VERSION;

/**
 * Lens CM Item content type
 */
export const LENS_CONTENT_TYPE = 'lens';
export type LENS_CONTENT_TYPE = typeof LENS_CONTENT_TYPE;
