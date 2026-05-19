import { type EuiBasicTableColumn, type EuiSearchBarOnChangeArgs } from '@elastic/eui';
import React, { Component } from 'react';
import type { ApplicationStart, Capabilities, NotificationsStart, ScopedHistory } from '@kbn/core/public';
import type { FeaturesPluginStart, KibanaFeature } from '@kbn/features-plugin/public';
import { type Space } from '../../../common';
import type { SpacesManager } from '../../spaces_manager';
interface Props {
    spacesManager: SpacesManager;
    notifications: NotificationsStart;
    serverBasePath: string;
    getFeatures: FeaturesPluginStart['getFeatures'];
    capabilities: Capabilities;
    history: ScopedHistory;
    getUrlForApp: ApplicationStart['getUrlForApp'];
    maxSpaces: number;
    allowSolutionVisibility: boolean;
    isServerless: boolean;
}
interface State {
    spaces: Space[];
    spacesFiltered: Space[];
    activeSpace: Space | null;
    features: KibanaFeature[];
    loading: boolean;
    showConfirmDeleteModal: boolean;
    selectedSpace: Space | null;
}
export declare class SpacesGridPage extends Component<Props, State> {
    constructor(props: Props);
    componentDidMount(): void;
    render(): React.JSX.Element;
    onQueryChange: ({ query }: EuiSearchBarOnChangeArgs) => void;
    debouncedOnQueryChange: import("lodash").DebouncedFunc<({ query }: EuiSearchBarOnChangeArgs) => void>;
    getPageContent(): React.JSX.Element;
    private canCreateSpaces;
    getPrimaryActionButton(): React.JSX.Element;
    getConfirmDeleteModal: () => React.JSX.Element | null;
    loadGrid: () => Promise<void>;
    getColumnConfig(): EuiBasicTableColumn<Space>[];
    private getEditSpacePath;
    private onDeleteSpaceClick;
}
export {};
