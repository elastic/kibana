/**
 * Represents the relevant information of an field
 */
export interface MappingField {
    /** the path of the field */
    path: string;
    /** the type of the field */
    type: string;
    /** meta attached to the field */
    meta: Record<string, string>;
    /** whether the field is searchable (defaults to true when not set) */
    searchable?: boolean;
}
