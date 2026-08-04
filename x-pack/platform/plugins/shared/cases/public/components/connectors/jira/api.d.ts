import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { IssueTypes, Fields, Issues, Issue } from './types';
export interface GetIssueTypesProps {
    http: HttpSetup;
    connectorId: string;
    signal?: AbortSignal;
}
export declare function getIssueTypes({ http, connectorId, signal }: GetIssueTypesProps): Promise<ActionTypeExecutorResult<IssueTypes>>;
export interface GetFieldsByIssueTypeProps {
    http: HttpSetup;
    connectorId: string;
    id: string;
    signal?: AbortSignal;
}
export declare function getFieldsByIssueType({ http, connectorId, id, signal, }: GetFieldsByIssueTypeProps): Promise<ActionTypeExecutorResult<Fields>>;
export interface GetIssuesTypeProps {
    http: HttpSetup;
    connectorId: string;
    title: string;
    signal?: AbortSignal;
}
export declare function getIssues({ http, connectorId, title, signal, }: GetIssuesTypeProps): Promise<ActionTypeExecutorResult<Issues>>;
export interface GetIssueTypeProps {
    http: HttpSetup;
    connectorId: string;
    id: string;
    signal?: AbortSignal;
}
export declare function getIssue({ http, connectorId, id, signal, }: GetIssueTypeProps): Promise<ActionTypeExecutorResult<Issue>>;
