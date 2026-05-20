import type { AssetsMap, PackageInstallContext } from '../../../../common/types';
export interface Field {
    name: string;
    type?: string;
    description?: string;
    value?: string;
    format?: string;
    date_format?: string;
    fields?: Fields;
    enabled?: boolean;
    path?: string;
    index?: boolean;
    required?: boolean;
    multi_fields?: Fields;
    normalizer?: string;
    doc_values?: boolean;
    copy_to?: string;
    analyzer?: string;
    search_analyzer?: string;
    ignore_above?: number;
    object_type?: string;
    object_type_mapping_type?: string;
    scaling_factor?: number;
    dynamic?: 'strict' | boolean;
    include_in_parent?: boolean;
    include_in_root?: boolean;
    null_value?: string;
    dimension?: boolean;
    default_field?: boolean;
    runtime?: boolean | string;
    subobjects?: boolean;
    store?: boolean;
    metrics?: string[];
    default_metric?: string;
    metric_type?: string;
    unit?: string;
    analyzed?: boolean;
    count?: number;
    searchable?: boolean;
    aggregatable?: boolean;
    script?: string;
    readFromDocValues?: boolean;
    pattern?: string;
    input_format?: string;
    output_format?: string;
    output_precision?: number;
    label_template?: string;
    url_template?: string;
    open_link_in_current_tab?: boolean;
}
export type Fields = Field[];
/**
 * expandFields takes the given fields read from yaml and expands them.
 * There are dotted fields in the field.yml like `foo.bar`. These should
 * be stored as an field within a 'group' field.
 */
export declare function expandFields(fields: Fields): Fields;
export declare const getField: (fields: Fields, pathNames: string[]) => Field | undefined;
export declare function processFieldsWithWildcard(fields: Fields): Fields;
export declare function processFieldWithoutObjectType(field: Field): Field;
export declare function processFields(fields: Fields): Fields;
export declare const isFields: (path: string) => boolean;
export declare const filterForTransformAssets: (transformName: string) => (path: string) => boolean;
/**
 * loadFieldsFromYaml
 *
 * Gets all field files, optionally filtered by dataset, extracts .yml files, merges them together
 */
export declare const loadDatastreamsFieldsFromYaml: (packageInstallContext: PackageInstallContext, fieldAssetsMap: AssetsMap, datasetName?: string) => Field[];
export declare const loadTransformFieldsFromYaml: (packageInstallContext: PackageInstallContext, fieldAssetsMap: AssetsMap, transformName: string) => Field[];
