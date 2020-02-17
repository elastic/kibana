/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type TitleProp = string | React.ReactNode;

export interface DraggableArguments {
  field: string;
  value: string;
}

export interface BadgeOptions {
  beta?: boolean;
  text: string;
  tooltip?: string;
}
