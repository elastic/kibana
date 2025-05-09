/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { z } from '@kbn/zod';
import { IModel, ModelRepresentation, OmitName } from '../core';
import { Validation, validation } from './validation';

// need explicit keys here to be able to generate Assert types (TS2775)
export interface ModelValidation<TLeft extends IModel = any, TRight extends TLeft = any> {
  Definition: Validation<TLeft['Definition'], TRight['Definition']>;
  Source: Validation<TLeft['Source'], TRight['Source']>;
  GetResponse: Validation<TLeft['GetResponse'], TRight['GetResponse']>;
  UpsertRequest: Validation<TLeft['UpsertRequest'], TRight['UpsertRequest']>;
}

export function joinValidation<TLeft extends IModel, TRight extends TLeft>(
  left: ModelValidation<any, TLeft>,
  rights: Array<ModelValidation<any, TRight>>
): ModelValidation<TLeft, TRight>;

export function joinValidation<TLeft extends IModel, TRight1 extends TLeft, TRight2 extends TLeft>(
  left: ModelValidation<any, TLeft>,
  rights: [ModelValidation<any, TRight1>, ModelValidation<any, TRight2>]
): ModelValidation<TLeft, TRight1 | TRight2>;

export function joinValidation(left: ModelValidation, rights: ModelValidation[]) {
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

type ModelOfSchema<TModelSchema extends ModelSchema> = {
  [key in keyof TModelSchema & ModelRepresentation]: z.input<TModelSchema[key]>;
};

type ModelSchema<TModel extends IModel = IModel> = {
  [key in keyof TModel & ModelRepresentation]: z.Schema<TModel[key]>;
};

export function modelValidation<TRightSchema extends ModelSchema>(
  right: TRightSchema
): ModelValidation<IModel, WithDefaults<TRightSchema>>;
export function modelValidation<TLeft extends IModel, TRightSchema extends ModelSchema>(
  left: ModelValidation<any, TLeft>,
  right: TRightSchema
): ModelValidation<TLeft, TLeft & WithDefaults<TRightSchema>>;

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
          // upsert doesn't allow name to be set
          stream: z
            .object({ name: z.undefined().optional() })
            .passthrough()
            // but the definition requires it, so we set a default
            .transform((prev) => ({ ...prev, name: '.' }))
            .pipe(rightPartial.Definition)
            // that should be removed after
            .transform((prev) => {
              delete prev.name;
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
    stream: OmitName<{} & z.input<TRightSchema['Definition']>>;
  };
} & ModelOfSchema<TRightSchema>;
