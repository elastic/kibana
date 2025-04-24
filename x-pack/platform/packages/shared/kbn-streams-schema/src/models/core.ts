/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ModelRepresentation = 'Definition' | 'Source' | 'GetResponse' | 'UpsertRequest';

export type OmitName<T extends { name?: string }> = Omit<T, 'name'> & { name?: never };

export type StrictOmit<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: never;
};

export interface IModel {
  Definition: Record<string, any>;
  Source: Record<string, any>;
  GetResponse: Record<string, any>;
  UpsertRequest: Record<string, any>;
}
