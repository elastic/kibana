import React, { Component } from 'react';
import type { Capabilities, NotificationsStart, ScopedHistory } from '@kbn/core/public';
import type { FeaturesPluginStart, KibanaFeature } from '@kbn/features-plugin/public';
import type { Space } from '../../../common';
import type { EventTracker } from '../../analytics';
import type { SpacesManager } from '../../spaces_manager';
import type { CustomizeSpaceFormValues } from '../types';
interface Props {
    getFeatures: FeaturesPluginStart['getFeatures'];
    notifications: NotificationsStart;
    spacesManager: SpacesManager;
    spaceId?: string;
    onLoadSpace?: (space: Space) => void;
    capabilities: Capabilities;
    history: ScopedHistory;
    allowFeatureVisibility: boolean;
    allowSolutionVisibility: boolean;
    eventTracker: EventTracker;
}
interface State {
    space: CustomizeSpaceFormValues;
    features: KibanaFeature[];
    originalSpace?: Partial<Space>;
    showAlteringActiveSpaceDialog: boolean;
    haveDisabledFeaturesChanged: boolean;
    hasSolutionViewChanged: boolean;
    isLoading: boolean;
    saveInProgress: boolean;
    formError?: {
        isInvalid: boolean;
        error?: string;
    };
}
export declare class CreateSpacePage extends Component<Props, State> {
    private readonly validator;
    constructor(props: Props);
    componentDidMount(): Promise<void>;
    componentDidUpdate(previousProps: Props, prevState: State): Promise<void>;
    private canEditProjectRouting;
    private setDefaultProjectRouting;
    render(): React.JSX.Element;
    getLoadingIndicator: () => React.JSX.Element;
    getForm: () => React.JSX.Element;
    getTitle: () => React.JSX.Element;
    getChangeImpactWarning: () => React.JSX.Element | null;
    getFormButtons: () => React.JSX.Element;
    private onSolutionViewChange;
    onSpaceChange: (updatedSpace: CustomizeSpaceFormValues) => void;
    saveSpace: () => void;
    private loadSpace;
    private performSave;
    private backToSpacesList;
}
export {};
