/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type EvalFetch = (path: string, options?: Record<string, unknown>) => Promise<unknown>;

export interface EcsAllowedValue {
  readonly name: string;
  /** For `event.category` values, the `event.type` values ECS allows alongside them. */
  readonly expectedEventTypes?: readonly string[];
}

export interface EcsField {
  readonly type?: string;
  readonly short?: string;
  readonly allowedValues?: readonly EcsAllowedValue[];
}

export type EcsFields = ReadonlyMap<string, EcsField>;

const ECS_FIELDS_PATH =
  '/internal/fields_metadata?source=ecs&attributes=name,type,short,allowed_values';

interface FieldsMetadataResponse {
  readonly fields: Record<
    string,
    {
      readonly type?: string;
      readonly short?: string;
      readonly allowed_values?: ReadonlyArray<{
        readonly name: string;
        readonly expected_event_types?: readonly string[];
      }>;
    }
  >;
}

/** Fetches ECS field definitions from Kibana's fields metadata service, the same source Automatic Import uses. */
export const fetchEcsFields = async (fetch: EvalFetch): Promise<EcsFields> => {
  const { fields } = (await fetch(ECS_FIELDS_PATH, {
    method: 'GET',
    headers: { 'elastic-api-version': '1' },
  })) as FieldsMetadataResponse;
  return new Map(
    Object.entries(fields).map(([name, { type, short, allowed_values: allowedValues }]) => [
      name,
      {
        type,
        short,
        allowedValues: allowedValues?.map(({ name: value, expected_event_types: types }) => ({
          name: value,
          expectedEventTypes: types,
        })),
      },
    ])
  );
};
