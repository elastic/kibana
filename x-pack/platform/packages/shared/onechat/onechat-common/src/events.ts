/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Base type for all onechat events
 */
export interface OnechatEvent<
  TEventType extends string,
  TData extends Record<string, any>,
  TMeta extends Record<string, any>
> {
  type: TEventType;
  data: TData;
  meta: TMeta;
}
