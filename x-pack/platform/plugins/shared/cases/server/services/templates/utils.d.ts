import type { ParsedTemplate } from '../../../common/types/domain/template/v1';
type ParsedField = ParsedTemplate['definition']['fields'][number];
export declare const toFieldNames: (fields: ParsedField[]) => {
    name: string;
    label: string;
    type: "integer" | "keyword" | "date" | "long" | "short" | "byte" | "double" | "float" | "half_float" | "scaled_float" | "unsigned_long";
    control: "INPUT_TEXT" | "TEXTAREA" | "RADIO_GROUP" | "DATE_PICKER" | "INPUT_NUMBER" | "SELECT_BASIC" | "CHECKBOX_GROUP" | "USER_PICKER";
}[];
/**
 * Trims leading/trailing whitespace from string-typed `metadata.default` values
 * in the YAML definition. Preserves comments and formatting of the rest of the document.
 */
export declare const trimFieldDefaults: (definition: string) => string;
export {};
