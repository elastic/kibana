import type { CaseUserProfile } from '../../../common/types/domain/user/v1';
export declare const emptyCaseAssigneesSanitizer: <T extends {
    assignees?: CaseUserProfile[];
}>(theCase: T) => T;
export declare const emptyCasesAssigneesSanitizer: <T extends {
    assignees?: CaseUserProfile[];
}>({ cases, }: {
    cases: T[];
}) => {
    cases: T[];
};
