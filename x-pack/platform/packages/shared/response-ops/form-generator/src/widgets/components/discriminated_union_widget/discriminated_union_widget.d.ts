import React from 'react';
import type { z } from '@kbn/zod/v4';
import type { EuiFormFieldsetProps } from '@elastic/eui';
import type { BaseWidgetPropsWithOptions } from '../../types';
type DiscriminatedUnionSchemaType = z.ZodDiscriminatedUnion<z.ZodObject<z.ZodRawShape>[]>;
export type DiscriminatedUnionWidgetProps = BaseWidgetPropsWithOptions<DiscriminatedUnionSchemaType, EuiFormFieldsetProps, z.ZodObject<z.ZodRawShape>> & {
    discriminatorKey: string;
};
export declare const getDiscriminatorKey: (schema: z.ZodDiscriminatedUnion) => string;
export declare const getDiscriminatorFieldValue: (schema: z.ZodObject<z.ZodRawShape>, discriminatorKey: string) => z.core.util.Literal;
export declare const DiscriminatedUnionWidget: React.FC<DiscriminatedUnionWidgetProps>;
export {};
