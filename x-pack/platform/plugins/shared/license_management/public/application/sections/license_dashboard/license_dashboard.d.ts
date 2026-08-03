import type { FC } from 'react';
import type { TelemetryPluginStart } from '../../lib/telemetry';
export interface Props {
    setBreadcrumb: (section: 'dashboard' | 'upload') => void;
    telemetry?: TelemetryPluginStart;
}
export declare const LicenseDashboard: FC<Props>;
