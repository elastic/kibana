import type { CasePostRequest } from '../types/api';
export type GetInitialCaseValueArgs = Partial<Omit<CasePostRequest, 'owner'>> & Pick<CasePostRequest, 'owner'>;
export declare const getInitialCaseValue: ({ owner, connector, ...restFields }: GetInitialCaseValueArgs) => CasePostRequest;
