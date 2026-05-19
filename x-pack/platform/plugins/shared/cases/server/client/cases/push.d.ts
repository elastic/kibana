import type { Case } from '../../../common/types/domain';
import type { CasesClient, CasesClientArgs } from '..';
/**
 * Parameters for pushing a case to an external system
 */
export interface PushParams {
    /**
     * The ID of a case
     */
    caseId: string;
    /**
     * The ID of an external system to push to
     */
    connectorId: string;
    /**
     * The type of push
     */
    pushType: 'manual' | 'automatic';
}
/**
 * Push a case to an external service.
 *
 * @ignore
 */
export declare const push: ({ connectorId, caseId, pushType }: PushParams, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<Case>;
