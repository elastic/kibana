export interface FieldTypeInfo {
    name: string;
    type: string;
    esType?: string;
}
/**
 * Fetches DataView field types for a stream.
 *
 * @param streamName - The name of the stream to fetch field types for
 * @returns Object containing field types map and DataView
 */
export declare function useStreamDataViewFieldTypes(streamName: string): {
    fieldTypes: FieldTypeInfo[] | undefined;
    fieldTypeMap: Map<string, string>;
    dataView: import("@kbn/data-views-plugin/common").DataView | undefined;
};
