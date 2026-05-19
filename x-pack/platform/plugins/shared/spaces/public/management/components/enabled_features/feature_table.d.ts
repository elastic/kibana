import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/public';
import type { Space } from '../../../../common';
interface Props {
    space: Partial<Space>;
    features: KibanaFeatureConfig[];
    onChange: (space: Partial<Space>) => void;
}
export declare class FeatureTable extends Component<Props, {}> {
    private featureCategories;
    constructor(props: Props);
    render(): React.JSX.Element;
    onChange: (featureId: string) => (e: ChangeEvent<HTMLInputElement>) => void;
    private getAllFeatureIds;
    private hideAll;
    private showAll;
    private setFeaturesVisibility;
    private getCategoryHelpText;
}
export {};
