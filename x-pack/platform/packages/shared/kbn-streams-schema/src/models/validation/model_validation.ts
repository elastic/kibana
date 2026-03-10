/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { z } from '@kbn/zod/v4';
import type { IModel, ModelRepresentation, OmitUpsertProps } from '../core';
import type { Validation } from './validation';
import { validation } from './validation';

// need explicit keys here to be able to generate Assert types (TS2775)
export interface ModelValidation<TLeft extends IModel = IModel, TRight extends TLeft = TLeft> {
  Definition: Validation<TLeft['Definition'], TRight['Definition']>;
  Source: Validation<TLeft['Source'], TRight['Source']>;
  GetResponse: Validation<TLeft['GetResponse'], TRight['GetResponse']>;
  UpsertRequest: Validation<TLeft['UpsertRequest'], TRight['UpsertRequest']>;
}

export function joinValidation<TLeft extends IModel, TRights extends [TLeft, TLeft, ...TLeft[]]>(
  left: ModelValidation<IModel, TLeft>,
  rights: { [K in keyof TRights]: ModelValidation<TLeft, TRights[K]> }
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
  [key in keyof TModelSchema & ModelRepresentation]: z.output<TModelSchema[key]>;
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
  left: ModelValidation<IModel, TLeft>,
  right: TRightSchema
): ModelValidation<TLeft, TLeft & TDefaults>;

export function modelValidation(...args: [ModelValidation, ModelSchema] | [ModelSchema]) {
  if (args.length === 1) {
    const right = args[0];
    const emptyRecord = z.record(z.string(), z.unknown());
    const emptyValidation = {
      Definition: validation(
        emptyRecord as z.ZodType<object>,
        z.looseObject({}) as z.ZodType<object>
      ),
      Source: validation(emptyRecord as z.ZodType<object>, z.looseObject({}) as z.ZodType<object>),
      GetResponse: validation(
        emptyRecord as z.ZodType<object>,
        z.looseObject({}) as z.ZodType<object>
      ),
      UpsertRequest: validation(
        emptyRecord as z.ZodType<object>,
        z.looseObject({}) as z.ZodType<object>
      ),
    };
    return modelValidation(emptyValidation, right);
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
            .looseObject({
              name: z.undefined().optional(),
              updated_at: z.undefined().optional(),
              ingest: z
                .looseObject({
                  processing: z.looseObject({ updated_at: z.undefined().optional() }),
                })
                .optional(),
            })
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
            .transform((prev, ctx) => {
              const result = rightPartial.Definition.safeParse(prev);
              if (!result.success) {
                for (const issue of result.error.issues) {
                  ctx.addIssue(issue);
                }
                return prev;
              }
              return result.data;
            })
            // that should be removed after
            .transform((prev) => {
              const prevRecord = prev as Record<string, unknown>;
              const hadIngest = 'ingest' in prevRecord;
              const hadProcessing =
                hadIngest &&
                typeof (prevRecord.ingest as Record<string, unknown>)?.processing !== 'undefined';
              delete prevRecord.name;
              delete prevRecord.updated_at;
              const ingest = prevRecord.ingest as
                | { processing?: { updated_at?: unknown }; [key: string]: unknown }
                | undefined;
              if (ingest?.processing && 'updated_at' in ingest.processing) {
                delete ingest.processing.updated_at;
              }
              if (!hadProcessing && ingest?.processing && Object.keys(ingest.processing).length === 0) {
                delete ingest.processing;
              }
              if (!hadIngest && ingest && Object.keys(ingest).length === 0) {
                delete prevRecord.ingest;
              }
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

interface WithDefaults<TRightSchema extends ModelSchema> {
  Definition: z.output<TRightSchema['Definition']>;
  Source: z.output<TRightSchema['Definition']>;
  GetResponse: {
    stream: z.output<TRightSchema['Definition']>;
  } & z.output<TRightSchema['GetResponse']>;
  UpsertRequest: {
    stream: OmitUpsertProps<{} & z.output<TRightSchema['Definition']>>;
  };
}
