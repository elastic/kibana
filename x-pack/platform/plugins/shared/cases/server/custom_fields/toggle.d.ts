export declare const getCasesToggleCustomField: () => {
    isFilterable: boolean;
    isSortable: boolean;
    savedObjectMappingType: string;
    validateFilteringValues: (values: Array<string | number | boolean | null>) => void;
    getDefaultValue: () => boolean;
};
