import { z } from '@kbn/zod/v4';
import type { BoolQuery } from '@kbn/es-query';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-types';
export declare const rangeSchema: z.ZodObject<{
    start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
    end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
}, z.core.$strip>;
export declare const kuerySchema: z.ZodObject<{
    kuery: z.ZodString;
}, z.core.$strip>;
export declare const probabilitySchema: z.ZodObject<{
    probability: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
export declare const offsetSchema: z.ZodObject<{
    offset: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const serviceTransactionDataSourceSchema: z.ZodObject<{
    documentType: z.ZodUnion<readonly [z.ZodLiteral<ApmDocumentType.ServiceTransactionMetric>, z.ZodLiteral<ApmDocumentType.TransactionMetric>, z.ZodLiteral<ApmDocumentType.TransactionEvent>]>;
    rollupInterval: z.ZodUnion<readonly [z.ZodLiteral<RollupInterval.OneMinute>, z.ZodLiteral<RollupInterval.TenMinutes>, z.ZodLiteral<RollupInterval.SixtyMinutes>, z.ZodLiteral<RollupInterval.None>]>;
}, z.core.$strip>;
export declare const transactionDataSourceSchema: z.ZodObject<{
    documentType: z.ZodUnion<readonly [z.ZodLiteral<ApmDocumentType.TransactionMetric>, z.ZodLiteral<ApmDocumentType.TransactionEvent>]>;
    rollupInterval: z.ZodUnion<readonly [z.ZodLiteral<RollupInterval.OneMinute>, z.ZodLiteral<RollupInterval.TenMinutes>, z.ZodLiteral<RollupInterval.SixtyMinutes>, z.ZodLiteral<RollupInterval.None>]>;
}, z.core.$strip>;
export declare const filtersSchema: z.ZodPipe<z.ZodString, z.ZodTransform<BoolQuery, string>>;
