import type { JSX } from 'react';
import type { TimelineItem } from '@kbn/response-ops-alerts-table/types';
interface PanelConfig {
    id: string | number;
    title?: JSX.Element | string;
    'data-test-subj'?: string;
}
export interface RenderContentPanelProps {
    alertItems: TimelineItem[];
    setIsBulkActionsLoading: (isLoading: boolean) => void;
    isAllSelected?: boolean;
    clearSelection?: () => void;
    refresh?: () => void;
    closePopoverMenu: () => void;
}
export interface ContentPanelConfig extends PanelConfig {
    renderContent: (args: RenderContentPanelProps) => JSX.Element;
    items?: never;
}
export {};
