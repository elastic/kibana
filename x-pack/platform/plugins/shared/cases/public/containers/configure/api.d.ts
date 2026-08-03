import type { ConfigurationPatchRequest, ConfigurationRequest } from '../../../common/types/api';
import type { ActionConnector, ActionTypeConnector } from '../../../common/types/domain';
import type { ApiProps, CasesConfigurationUI } from '../types';
export declare const getSupportedActionConnectors: ({ signal, }: ApiProps) => Promise<ActionConnector[]>;
export declare const getCaseConfigure: ({ signal, }: ApiProps) => Promise<CasesConfigurationUI[] | null>;
export declare const postCaseConfigure: (caseConfiguration: ConfigurationRequest) => Promise<CasesConfigurationUI>;
export declare const patchCaseConfigure: (id: string, caseConfiguration: ConfigurationPatchRequest) => Promise<CasesConfigurationUI>;
export declare const fetchActionTypes: ({ signal }: ApiProps) => Promise<ActionTypeConnector[]>;
