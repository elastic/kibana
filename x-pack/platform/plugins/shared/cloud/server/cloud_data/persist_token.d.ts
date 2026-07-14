import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { CloudSecurityAnswer, ResourceData } from '../../common/types';
export declare const persistTokenCloudData: (savedObjectsClient: SavedObjectsClientContract, { logger, returnError, onboardingToken, solutionType, security, resourceData, }: {
    logger?: Logger;
    returnError?: boolean;
    onboardingToken?: string;
    solutionType?: string;
    security?: CloudSecurityAnswer;
    resourceData?: ResourceData;
}) => Promise<void>;
