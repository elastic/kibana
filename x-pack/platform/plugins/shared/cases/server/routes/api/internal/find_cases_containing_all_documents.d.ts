import { type CasesClient } from '../../../client';
export declare const findCasesContainingAllDocumentsRoute: import("../types").CaseRoute<unknown, unknown, Readonly<{
    documentIds?: string[] | undefined;
} & {
    caseIds: string[];
}>>;
export declare const isStringOrArray: (value: unknown) => value is string | string[];
export declare const processCase: (casesClient: CasesClient, caseId: string, documentIds: Set<string>) => Promise<string | null>;
