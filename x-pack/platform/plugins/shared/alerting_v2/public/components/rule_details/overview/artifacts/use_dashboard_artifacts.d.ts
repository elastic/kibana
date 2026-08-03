import { type Dashboard, type MissingDashboard } from '@kbn/alerting-v2-rule-form';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { RuleApiResponse } from '../../../../services/rules_api';
export declare const useDashboardArtifacts: (artifacts: RuleApiResponse["artifacts"], dashboard: DashboardStart | undefined) => {
    dashboardArtifacts: {
        id: string;
        type: string;
        value: string;
    }[];
    resolved: Dashboard[];
    missing: MissingDashboard[];
    isLoading: boolean;
    isError: boolean;
    artifactIdByDashboardId: Map<string, string>;
};
