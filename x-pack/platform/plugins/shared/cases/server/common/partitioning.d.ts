import type { SavedObject } from '@kbn/core/server';
export declare const partitionByCaseAssociation: <T>(caseId: string, attachments: Array<SavedObject<T>>) => [SavedObject<T>[], SavedObject<T>[]];
