/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { z } from '@kbn/zod';
import type { IModel, ModelRepresentation, OmitUpsertProps } from '../core';
import type { Validation } from './validation';
import { validation } from './validation';

// need explicit keys here to be able to generate Assert types (TS2775)
export interface ModelValidation<TLeft extends IModel = any, TRight extends TLeft = any> {
  Definition: Validation<TLeft['Definition'], TRight['Definition']>;
  Source: Validation<TLeft['Source'], TRight['Source']>;
  GetResponse: Validation<TLeft['GetResponse'], TRight['GetResponse']>;
  UpsertRequest: Validation<TLeft['UpsertRequest'], TRight['UpsertRequest']>;
}

export function joinValidation<TLeft extends IModel, TRights extends [TLeft, TLeft, ...TLeft[]]>(
  left: ModelValidation<any, TLeft>,
  rights: { [K in keyof TRights]: ModelValidation<any, TRights[K]> }
): ModelValidation<TLeft, TRights[number]> {
  function join<TKey extends keyof IModel>(key: TKey) {
    return validation(
      left[key].right,
      z.union(
        rights.map((right) => right[key].right) as [
          ModelSchema[TKey],
          ModelSchema[TKey],
          ...Array<ModelSchema[TKey]>
        ]
      )
    );
  }

  return {
    Definition: join('Definition'),
    GetResponse: join('GetResponse'),
    Source: join('Source'),
    UpsertRequest: join('UpsertRequest'),
  };
}

export type ModelOfSchema<TModelSchema extends ModelSchema> = {
  [key in keyof TModelSchema & ModelRepresentation]: z.input<TModelSchema[key]>;
};

export type ModelSchema<TModel extends IModel = IModel> = {
  [key in keyof TModel & ModelRepresentation]: z.Schema<TModel[key]>;
};

export function modelValidation<
  TRightSchema extends ModelSchema,
  TDefaults extends IModel = WithDefaults<TRightSchema>
>(right: TRightSchema): ModelValidation<IModel, TDefaults>;
export function modelValidation<
  TLeft extends IModel,
  TRightSchema extends ModelSchema,
  TDefaults extends IModel = WithDefaults<TRightSchema>
>(
  left: ModelValidation<any, TLeft>,
  right: TRightSchema
): ModelValidation<TLeft, TLeft & TDefaults>;

export function modelValidation(...args: [ModelValidation, ModelSchema] | [ModelSchema]) {
  if (args.length === 1) {
    const right = args[0];

    return modelValidation(
      {
        Definition: validation(z.any(), z.object({})),
        Source: validation(z.any(), z.object({})),
        GetResponse: validation(z.any(), z.object({})),
        UpsertRequest: validation(z.any(), z.object({})),
      },
      right
    );
  }

  const left = mapValues(args[0], (value) => value.right);

  const rightPartial = args[1];

  const right = {
    Definition: z.intersection(left.Definition, rightPartial.Definition),
    Source: z.intersection(
      left.Source,
      z.intersection(rightPartial.Definition, rightPartial.Source)
    ),
    GetResponse: z.intersection(
      left.GetResponse,
      z.intersection(
        z.object({
          stream: rightPartial.Definition,
        }),
        rightPartial.GetResponse
      )
    ),
    UpsertRequest: z.intersection(
      left.UpsertRequest,
      z.intersection(
        z.object({
          // upsert doesn't allow some properties to be set
          stream: z
            .object({
              name: z.undefined().optional(),
              updated_at: z.undefined().optional(),
              ingest: z
                .object({
                  processing: z.object({ updated_at: z.undefined().optional() }).passthrough(),
                })
                .passthrough()
                .optional(),
            })
            .passthrough()
            // but the definition requires them, so we set a default
            .transform((prev) => ({
              ...prev,
              name: '.',
              updated_at: new Date().toISOString(),
              ingest: {
                ...prev.ingest,
                processing: { ...prev.ingest?.processing, updated_at: new Date().toISOString() },
              },
            }))
            .pipe(rightPartial.Definition)
            // that should be removed after
            .transform((prev) => {
              delete prev.name;
              delete prev.updated_at;
              delete prev.ingest?.processing?.updated_at;
              return prev;
            }),
        }),
        rightPartial.UpsertRequest
      )
    ),
  };

  return {
    Definition: validation(left.Definition, right.Definition),
    Source: validation(left.Source, right.Source),
    GetResponse: validation(left.GetResponse, right.GetResponse),
    UpsertRequest: validation(left.UpsertRequest, right.UpsertRequest),
  };
}

type WithDefaults<TRightSchema extends ModelSchema> = {
  Source: z.input<TRightSchema['Definition']>;
  GetResponse: {
    stream: z.input<TRightSchema['Definition']>;
  };
  UpsertRequest: {
    stream: OmitUpsertProps<{} & z.input<TRightSchema['Definition']>>;
  };
} & ModelOfSchema<TRightSchema>;
