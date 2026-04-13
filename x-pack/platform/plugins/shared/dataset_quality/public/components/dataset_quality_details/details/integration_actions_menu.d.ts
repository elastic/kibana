import React from 'react';
import type { Integration } from '../../../../common/data_streams_stats/integration';
import type { Dashboard } from '../../../../common/api_types';
export declare function IntegrationActionsMenu({ integration, dashboards, dashboardsLoading, }: {
    integration: Integration;
    dashboards?: Dashboard[];
    dashboardsLoading: boolean;
}): React.JSX.Element;
