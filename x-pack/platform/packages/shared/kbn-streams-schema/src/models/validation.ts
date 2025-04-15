/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { IModel, ModelRepresentation, OmitName } from './core';

type Is<TLeft, TRight extends TLeft> = (value: TLeft) => value is TRight;
type As<TLeft, TRight extends TLeft> = (value: TRight) => TRight;
type Asserts<TLeft, TRight extends TLeft> = (value: TLeft) => asserts value is TRight;
type Parse<TLeft, TRight extends TLeft> = (value: TLeft) => TRight;

function createIs<TLeft, TRight extends TLeft>(
  _base: z.Schema<TLeft>,
  narrow: z.Schema<TRight>
): Is<TLeft, TRight> {
  return (value: TLeft): value is TRight => {
    return narrow.safeParse(value).success;
  };
}

function createAs<TLeft, TRight extends TLeft>(
  _base: z.Schema<TLeft>,
  _narrow: z.Schema<TRight>
): As<TLeft, TRight> {
  return (value: TRight): TRight => {
    return value;
  };
}

function createAsserts<TLeft, TRight extends TLeft>(
  _base: z.Schema<TLeft>,
  narrow: z.Schema<TRight>
): Asserts<TLeft, TRight> {
  return (value: TLeft) => {
    narrow.parse(value);
    return true;
  };
}

function createParse<TLeft, TRight extends TLeft>(
  _base: z.Schema<TLeft>,
  narrow: z.Schema<TRight>
): Parse<TLeft, TRight> {
  return (value: TLeft): TRight => {
    narrow.parse(value);
    return value as TRight;
  };
}

export interface Validation<TLeft = any, TRight extends TLeft = any> {
  is: Is<TLeft, TRight>;
  as: As<TLeft, TRight>;
  asserts: Asserts<TLeft, TRight>;
  parse: Parse<TLeft, TRight>;
  left: z.Schema<TLeft>;
  right: z.Schema<TRight>;
}

function validation<TLeft, TRight extends TLeft>(
  left: z.Schema<TLeft>,
  right: z.Schema<TRight>
): Validation<TLeft, TRight> {
  return {
    is: createIs(left, right),
    as: createAs(left, right),
    asserts: createAsserts(left, right),
    parse: createParse(left, right),
    left,
    right,
  };
}

// need explicit keys here to be able to generate Assert types (TS2775)
export interface ModelValidation<TLeft extends IModel = any, TRight extends TLeft = any> {
  Definition: Validation<TLeft['Definition'], TRight['Definition']>;
  Source: Validation<TLeft['Source'], TRight['Source']>;
  GetResponse: Validation<TLeft['GetResponse'], TRight['GetResponse']>;
  UpsertRequest: Validation<TLeft['UpsertRequest'], TRight['UpsertRequest']>;
}

function joinValidation<TLeft extends IModel, TRight extends TLeft>(
  left: ModelValidation<any, TLeft>,
  rights: Array<ModelValidation<any, TRight>>
): ModelValidation<TLeft, TRight>;
function joinValidation<TLeft extends IModel, TRight1 extends TLeft, TRight2 extends TLeft>(
  left: ModelValidation<any, TLeft>,
  rights: [ModelValidation<any, TRight1>, ModelValidation<any, TRight2>]
): ModelValidation<TLeft, TRight1 | TRight2>;

function joinValidation(left: ModelValidation, rights: ModelValidation[]) {
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

function modelValidation<TRightSchema extends ModelSchema>(
  right: TRightSchema
): ModelValidation<IModel, WithDefaults<TRightSchema>>;
function modelValidation<TLeft extends IModel, TRightSchema extends ModelSchema>(
  left: ModelValidation<any, TLeft>,
  right: TRightSchema
): ModelValidation<TLeft, TLeft & WithDefaults<TRightSchema>>;

function modelValidation(...args: [ModelValidation, ModelSchema] | [ModelSchema]) {
  if (args.length === 1) {
    const right = args[0];

    return {
      Definition: validation(z.record(z.any()), right.Definition),
      GetResponse: validation(z.record(z.any()), right.GetResponse),
      Source: validation(z.record(z.any()), right.Source),
      UpsertRequest: validation(z.record(z.any()), right.UpsertRequest),
    } satisfies ModelValidation<IModel, IModel>;
  }

  const [left, right] = args;

  return {
    Definition: validation(left.Definition.right, right.Definition),
    Source: validation(left.Source.right, z.intersection(right.Definition, right.Source)),
    GetResponse: validation(
      left.GetResponse.right,
      z.intersection(z.object({ stream: right.Definition }), right.GetResponse)
    ),
    UpsertRequest: validation(
      left.UpsertRequest.right,
      z.intersection(
        z.object({ stream: right.Definition }),
        z.intersection(right.UpsertRequest, z.object({ name: z.never() }).optional())
      )
    ),
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

export { validation, modelValidation, joinValidation };
