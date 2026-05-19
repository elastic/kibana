import type { CaseAssignees, CaseCustomFields, CaseSettings } from '../../../common/types/domain';
export declare const isStringArray: (value: unknown) => value is string[];
export declare const isAssigneesArray: (value: unknown) => value is CaseAssignees;
export declare const isCustomFieldsArray: (value: unknown) => value is CaseCustomFields;
export declare const isCaseSettings: (value: unknown) => value is CaseSettings;
export declare const isExtendedFields: (value: unknown) => value is Record<string, string>;
