import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import type { ClientConfigType, ReportingAPIClient } from '@kbn/reporting-public';
import type { Section } from '../../constants';
export interface MatchParams {
    section: Section;
}
export interface ReportingTabsProps {
    config: ClientConfigType;
    apiClient: ReportingAPIClient;
}
export declare const IlmPolicyWrapper: React.FunctionComponent<Partial<RouteComponentProps> & ReportingTabsProps>;
export { IlmPolicyWrapper as default };
