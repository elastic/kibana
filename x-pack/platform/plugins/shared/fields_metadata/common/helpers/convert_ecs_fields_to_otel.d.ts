import type { FieldMetadataPlain } from '..';
/**
 * Maps ECS field to corresponding OTel semantic convention attribute.
 *
 * See https://www.elastic.co/docs/reference/ecs/ecs-otel-alignment-details for full reference.
 */
export declare function getOtelFieldName(fieldMetadata: FieldMetadataPlain): string;
