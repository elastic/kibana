import type { ParsedTemplate } from '../../../common/types/domain/template/v1';
type ParsedField = ParsedTemplate['definition']['fields'][number];
export declare const toFieldNames: (fields: ParsedField[]) => {
    name: string;
    label: string;
    type: "date" | "short" | "long" | "integer" | "keyword" | "byte" | "double" | "float" | "unsigned_long" | "half_float" | "scaled_float";
    control: "INPUT_TEXT" | "INPUT_NUMBER" | "SELECT_BASIC" | "TEXTAREA" | "DATE_PICKER" | "CHECKBOX_GROUP" | "RADIO_GROUP" | "USER_PICKER";
}[];
/**
 * Trims leading/trailing whitespace from string-typed `metadata.default` values
 * in the YAML definition. Preserves comments and formatting of the rest of the document.
 */
export declare const trimFieldDefaults: (definition: string) => string;
export {};
