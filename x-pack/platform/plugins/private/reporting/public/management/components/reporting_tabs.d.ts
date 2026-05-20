import React from 'react';
import type { ClientConfigType } from '@kbn/reporting-public';
import type { Section } from '../../constants';
export interface MatchParams {
    section: Section;
}
export interface ReportingTabsProps {
    config: ClientConfigType;
}
export declare const ReportingTabs: React.FunctionComponent<{
    config: ClientConfigType;
}>;
export { ReportingTabs as default };
