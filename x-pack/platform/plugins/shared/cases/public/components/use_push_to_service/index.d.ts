import type { CaseConnector } from '../../../common/types/domain';
import type { ErrorMessage } from './callout/types';
import type { CaseConnectors } from '../../containers/types';
export interface UsePushToService {
    caseConnectors: CaseConnectors;
    caseId: string;
    caseStatus: string;
    connector: CaseConnector;
    isValidConnector: boolean;
}
export interface ReturnUsePushToService {
    errorsMsg: ErrorMessage[];
    hasBeenPushed: boolean;
    needsToBePushed: boolean;
    hasPushPermissions: boolean;
    isLoading: boolean;
    hasErrorMessages: boolean;
    hasLicenseError: boolean;
    handlePushToService: () => Promise<void>;
}
export declare const usePushToService: ({ caseId, caseConnectors, connector, isValidConnector, }: UsePushToService) => ReturnUsePushToService;
