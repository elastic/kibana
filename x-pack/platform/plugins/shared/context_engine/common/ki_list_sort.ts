/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KI_LIST_SORTS = ['updated', 'title'] as const;
export type KiListSort = (typeof KI_LIST_SORTS)[number];
export const DEFAULT_KI_LIST_SORT: KiListSort = 'updated';
