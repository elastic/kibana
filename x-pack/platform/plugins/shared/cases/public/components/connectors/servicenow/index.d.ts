import type { CaseConnector } from '../types';
import type { ServiceNowITSMFieldsType, ServiceNowSIRFieldsType } from '../../../../common/types/domain';
export declare const getServiceNowITSMCaseConnector: () => CaseConnector<ServiceNowITSMFieldsType>;
export declare const getServiceNowSIRCaseConnector: () => CaseConnector<ServiceNowSIRFieldsType>;
export declare const serviceNowITSMFieldLabels: {
    impact: string;
    severity: string;
    urgency: string;
};
