/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ModelRepresentation = 'Definition' | 'Source' | 'GetResponse' | 'UpsertRequest';

export type OmitUpsertProps<T extends { name?: string; updated_at?: string }> = Omit<
  T,
  'name' | 'updated_at'
> & { name?: never; updated_at?: never };

export type StrictOmit<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: never;
};

export interface IModel {
  Definition: Record<string, any>;
  Source: Record<string, any>;
  GetResponse: Record<string, any>;
  UpsertRequest: Record<string, any>;
}
