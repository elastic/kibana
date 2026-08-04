import type { CaseConnector } from '../types';
import type { JiraFieldsType } from '../../../../common/types/domain';
export type * from './types';
export declare const getCaseConnector: () => CaseConnector<JiraFieldsType>;
export declare const fieldLabels: {
    issueType: string;
    priority: string;
    parent: string;
};
