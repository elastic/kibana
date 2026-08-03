import { type TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { ChangePointAnnotation, FieldConfig } from './change_point_detection_context';
/**
 * Provides common props for the Lens Embeddable component
 * based on the change point definition and currently applied filters and query.
 */
export declare const useCommonChartProps: ({ annotation, fieldConfig, previewMode, bucketInterval, }: {
    fieldConfig: FieldConfig;
    annotation: ChangePointAnnotation;
    previewMode?: boolean;
    bucketInterval: string;
}) => Partial<TypedLensByValueInput>;
