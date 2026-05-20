import type { FC } from 'react';
import type { ExecutionContextStart } from '@kbn/core/public';
import type { TelemetryPluginStart } from './lib/telemetry';
export interface Props {
    hasPermission: boolean | undefined;
    permissionsLoading: boolean | undefined;
    permissionsError: unknown;
    telemetry?: TelemetryPluginStart;
    loadPermissions: () => void;
    executionContext: ExecutionContextStart;
}
export declare const App: FC<Props>;
