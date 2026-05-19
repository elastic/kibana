interface CommonFieldConfig {
    type: string;
    fieldName?: string;
    secondaryType?: string;
}
export declare function matchFieldType<T extends CommonFieldConfig>(fieldType: string, config: T): boolean;
export declare function filterFields<T extends CommonFieldConfig>(fields: T[], visibleFieldNames: string[] | undefined, visibleFieldTypes: string[] | undefined): {
    filteredFields: T[];
    visibleFieldsCount: number;
    visibleMetricsCount: number;
};
export {};
