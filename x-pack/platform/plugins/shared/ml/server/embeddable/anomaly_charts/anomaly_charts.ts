import { schema } from '@kbn/config-schema';
import { timeRangeSchema } from '@kbn/es-query-server';
import { serializedTitlesSchema } from '../schemas';
import { ML_ENTITY_FIELD_OPERATIONS, ML_ENTITY_FIELD_TYPE } from '../../../../../../packages/shared/ml/anomaly_utils';

export const severityThresholdSchema = schema.object({
  min: schema.number(),
  max: schema.maybe(schema.number()),
});

export const mlEntityFieldTypeSchema = schema.oneOf([
  schema.literal(ML_ENTITY_FIELD_TYPE.BY),
  schema.literal(ML_ENTITY_FIELD_TYPE.OVER),
  schema.literal(ML_ENTITY_FIELD_TYPE.PARTITON),
]);

export const mlEntityFieldOperationSchema = schema.oneOf([
  schema.literal(ML_ENTITY_FIELD_OPERATIONS.ADD),
  schema.literal(ML_ENTITY_FIELD_OPERATIONS.REMOVE),
]);

export const mlEntityFieldSchema = schema.object({
  fieldName: schema.string(),
  fieldValue: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
  fieldType: schema.maybe(mlEntityFieldTypeSchema),
  operation: schema.maybe(mlEntityFieldOperationSchema),
  cardinality: schema.maybe(schema.number()),
});

export const anomalyChartsEmbeddableRuntimeStateSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  maxSeriesToPlot: schema.number(),
  severityThreshold: schema.maybe(schema.arrayOf(severityThresholdSchema)),
  selectedEntities: schema.maybe(schema.arrayOf(mlEntityFieldSchema)),
});

export const anomalyChartsEmbeddableOverridableStateSchema = schema.object({
  ...anomalyChartsEmbeddableRuntimeStateSchema.getPropSchemas(),
  timeRange: schema.maybe(timeRangeSchema),
});

export const anomalyChartsEmbeddableStateSchema = schema.object({
  ...serializedTitlesSchema.getPropSchemas(),
  ...anomalyChartsEmbeddableOverridableStateSchema.getPropSchemas(),
});

