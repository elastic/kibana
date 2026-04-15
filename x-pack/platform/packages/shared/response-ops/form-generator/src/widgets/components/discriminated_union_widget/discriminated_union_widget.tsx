/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { z } from '@kbn/zod/v4';
import type { EuiFormFieldsetProps } from '@elastic/eui';
import { SingleOptionUnionWidget } from './single_option_union_widget';
import type { BaseWidgetPropsWithOptions } from '../../types';
import { MultiOptionUnionWidget } from './multi_option_union_widget';

type DiscriminatedUnionSchemaType = z.ZodDiscriminatedUnion<z.ZodObject<z.ZodRawShape>[]>;

export type DiscriminatedUnionWidgetProps = BaseWidgetPropsWithOptions<
  DiscriminatedUnionSchemaType,
  EuiFormFieldsetProps,
  z.ZodObject<z.ZodRawShape>
> & {
  discriminatorKey: string;
};

// We couldn't find a better way to get the discriminator key from a ZodDiscriminatedUnion schema.
// It accesses the internal `_def` property, which is not part of the public API.
export const getDiscriminatorKey = (schema: z.ZodDiscriminatedUnion): string => {
  return (schema as unknown as { _def: { discriminator: string } })._def.discriminator;
};

export const getDiscriminatorFieldValue = (
  schema: z.ZodObject<z.ZodRawShape>,
  discriminatorKey: string
) => {
  return (schema.shape[discriminatorKey] as z.ZodLiteral).value;
};

export const DiscriminatedUnionWidget: React.FC<DiscriminatedUnionWidgetProps> = (props) => {
  const { schema, path } = props;
  const options = schema.options;

  if (!options) {
    throw new Error(`DiscriminatedUnionWidget requires options in schema at path: ${path}`);
  }

  const discriminatorKey = getDiscriminatorKey(schema);

  return options.length === 1 ? (
    <SingleOptionUnionWidget {...props} options={options} discriminatorKey={discriminatorKey} />
  ) : (
    <MultiOptionUnionWidget {...props} options={options} discriminatorKey={discriminatorKey} />
  );
};
