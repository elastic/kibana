import type { CaseSeverity, CaseUI } from '../../../../../../../common';
import type { Assignee } from '../../../../../user_profiles/types';
/**
 * Field-update actions for the "Attributes" sidebar section: tags, category,
 * severity, and assignees. Owns its own `useOnUpdateField` instance so that
 * its loading state is independent from other sidebar sections.
 */
export declare const useAttributesFieldActions: ({ caseData }: {
    caseData: CaseUI;
}) => {
    onUpdateField: ({ key, value, onSuccess, onError }: import("../../../../../case_view/types").OnUpdateFields) => void;
    onSubmitTags: (newTags: string[]) => void;
    onSubmitCategory: (newCategory: string | null) => void;
    onUpdateSeverity: (newSeverity: CaseSeverity) => void;
    onUpdateAssignees: (newAssignees: Assignee[]) => void;
    isSeverityLoading: boolean;
    isStatusLoading: boolean;
    isTagsLoading: boolean;
    isCategoryLoading: boolean;
    isAssigneeFieldLoading: boolean;
};
