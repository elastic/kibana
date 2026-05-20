import type { EsqlParam } from '../types/tool_form_types';
export declare const useEsqlParamsValidation: () => {
    triggerEsqlParamWarnings: () => void;
    triggerEsqlParamFieldsValidation: (fieldsToValidate: Array<keyof EsqlParam>) => void;
};
