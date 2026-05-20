import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
export declare const getFieldFormatterProvider: (fieldFormats: FieldFormatsStart) => (fieldType: FIELD_FORMAT_IDS, params?: FieldFormatParams) => (value: unknown, contentType?: import("@kbn/field-formats-plugin/common").FieldFormatsContentType, options?: import("@kbn/field-formats-plugin/common").TextContextTypeOptions) => string;
export declare function useFieldFormatter(fieldType: FIELD_FORMAT_IDS): (value: unknown, contentType?: import("@kbn/field-formats-plugin/common").FieldFormatsContentType, options?: import("@kbn/field-formats-plugin/common").TextContextTypeOptions) => string;
