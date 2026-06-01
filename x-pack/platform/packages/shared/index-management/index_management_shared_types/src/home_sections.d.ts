import type { FunctionComponent, ReactNode } from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { EuiBreadcrumb, EuiThemeComputed } from '@elastic/eui';
import type { Index } from './types';
export declare enum Section {
    Indices = "indices",
    DataStreams = "data_streams",
    IndexTemplates = "templates",
    ComponentTemplates = "component_templates",
    EnrichPolicies = "enrich_policies"
}
export declare enum IndexDetailsSection {
    Overview = "overview",
    Mappings = "mappings",
    Settings = "settings",
    Stats = "stats"
}
export type IndexDetailsTabId = IndexDetailsSection | string;
export interface IndexDetailsTab {
    id: IndexDetailsTabId;
    name: ReactNode;
    /**
     * A function that renders the content of the tab.
     *
     * IMPORTANT: This expects an arrow function that returns JSX, NOT a component passed directly.
     *
     * @example
     * // Correct - arrow function returning JSX:
     * renderTabContent: ({ index, getUrlForApp }) => (
     *   <MyTabComponent index={index} getUrlForApp={getUrlForApp} />
     * )
     *
     * // Wrong - passing a component directly will break if it uses hooks:
     * renderTabContent: MyTabComponent
     */
    renderTabContent: (args: {
        index: Index;
        getUrlForApp: ApplicationStart['getUrlForApp'];
        euiTheme: EuiThemeComputed;
    }) => ReturnType<FunctionComponent>;
    order: number;
    shouldRenderTab?: (args: {
        index: Index;
    }) => boolean;
    breadcrumb?: EuiBreadcrumb;
}
