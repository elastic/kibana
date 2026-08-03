import type { CaseUI } from '../../../../../../../common';
import type { CaseUICustomField } from '../../../../../../../common/ui/types';
/**
 * Field-update actions for the "Template fields" sidebar section: custom
 * fields and template-defined extended fields. Owns its own `useOnUpdateField`
 * instance so that its loading state is independent from other sidebar
 * sections.
 */
export declare const useTemplateFieldsActions: ({ caseData }: {
    caseData: CaseUI;
}) => {
    onUpdateField: ({ key, value, onSuccess, onError }: import("../../../../../case_view/types").OnUpdateFields) => void;
    onSubmitCustomField: (customField: CaseUICustomField) => void;
    isCustomFieldsLoading: boolean;
};
