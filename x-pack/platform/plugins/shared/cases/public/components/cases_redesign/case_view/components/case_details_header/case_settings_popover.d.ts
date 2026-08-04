import type { FC } from 'react';
interface CaseSettingsPopoverProps {
    syncAlerts: boolean;
    onSyncAlertsChange: (enabled: boolean) => void;
    extractObservables: boolean;
    onExtractObservablesChange: (enabled: boolean) => void;
    showMetrics: boolean;
    onShowMetricsChange: (enabled: boolean) => void;
    isOpen: boolean;
    onClose: () => void;
    anchorElement: HTMLElement;
}
export declare const CaseSettingsPopover: FC<CaseSettingsPopoverProps>;
export {};
