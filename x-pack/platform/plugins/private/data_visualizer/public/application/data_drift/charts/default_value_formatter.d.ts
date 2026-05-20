import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
export declare const getFieldFormatType: (type: string) => FIELD_FORMAT_IDS.BOOLEAN | FIELD_FORMAT_IDS.NUMBER | FIELD_FORMAT_IDS.STRING;
export declare const useFieldFormatter: (fieldType: FIELD_FORMAT_IDS) => (v: unknown) => string;
