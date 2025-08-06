/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lens CM Item Version `v1`
 */
export const LENS_ITEM_VERSION_V1 = 1 as const;
export type LENS_ITEM_VERSION_V1 = typeof LENS_ITEM_VERSION_V1;

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
