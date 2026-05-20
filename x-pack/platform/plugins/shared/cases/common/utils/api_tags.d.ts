import type { Owner } from '../constants/types';
export interface CasesApiTags {
    all: readonly string[];
    read: readonly string[];
    delete: readonly string[];
    createComment: readonly string[];
}
export declare const getApiTags: (owner: Owner) => CasesApiTags;
