import type { CustomFieldTypes } from '../../common/types/domain';
export interface ICasesCustomField {
    isFilterable: boolean;
    isSortable: boolean;
    savedObjectMappingType: string;
    validateFilteringValues: (values: Array<string | number | boolean | null>) => void;
    getDefaultValue?: () => boolean | string | null;
}
export interface CasesCustomFieldsMap {
    get: (type: CustomFieldTypes) => ICasesCustomField | null;
}
