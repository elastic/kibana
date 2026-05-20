import type { SharePluginStart } from '@kbn/share-plugin/public';
import { type MlPages } from '../../../../locator';
import type { FlyoutType } from '../../../jobs/components/job_details_flyout/job_details_flyout_context';
export declare const getOptionsForJobSelectorMenuItems: ({ jobId, page, onRemoveJobId, removeJobIdDisabled, showRemoveJobId, isSingleMetricViewerDisabled, closePopover, globalState, setActiveFlyout, setActiveJobId, navigateToUrl, share, }: {
    jobId: string;
    page: MlPages;
    onRemoveJobId: (jobOrGroupId: string[]) => void;
    removeJobIdDisabled: boolean;
    showRemoveJobId: boolean;
    isSingleMetricViewerDisabled: boolean;
    closePopover: () => void;
    globalState: Record<string, any>;
    setActiveFlyout: (flyout: FlyoutType | null) => void;
    setActiveJobId: (jobId: string | null) => void;
    navigateToUrl: (url: string) => void;
    share: SharePluginStart;
}) => ((import("@elastic/eui").DisambiguateSet<(import("@elastic/eui").DisambiguateSet<import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemDescriptorEntry, import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemSeparator> & import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemSeparator) | (import("@elastic/eui").DisambiguateSet<import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemSeparator, import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemDescriptorEntry> & Omit<import("@elastic/eui").EuiContextMenuItemProps, "hasPanel"> & {
    name: React.ReactNode;
    key?: string;
    panel?: import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelId;
}), import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemRenderCustom> & import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemRenderCustom) | (import("@elastic/eui").DisambiguateSet<import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemRenderCustom, (import("@elastic/eui").DisambiguateSet<import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemDescriptorEntry, import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemSeparator> & import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemSeparator) | (import("@elastic/eui").DisambiguateSet<import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemSeparator, import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemDescriptorEntry> & Omit<import("@elastic/eui").EuiContextMenuItemProps, "hasPanel"> & {
    name: React.ReactNode;
    key?: string;
    panel?: import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelId;
})> & ((import("@elastic/eui").DisambiguateSet<import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemDescriptorEntry, import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemSeparator> & import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemSeparator) | (import("@elastic/eui").DisambiguateSet<import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemSeparator, import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelItemDescriptorEntry> & Omit<import("@elastic/eui").EuiContextMenuItemProps, "hasPanel"> & {
    name: React.ReactNode;
    key?: string;
    panel?: import("@elastic/eui/src/components/context_menu/context_menu").EuiContextMenuPanelId;
}))))[];
