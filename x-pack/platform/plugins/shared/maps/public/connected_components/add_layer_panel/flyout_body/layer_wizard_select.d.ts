import React, { Component } from 'react';
import type { LayerWizard, LayerWizardWithMeta } from '../../../classes/layers';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';
import './layer_wizard_select.scss';
interface Props {
    onSelect: (layerWizard: LayerWizard) => void;
}
interface State {
    activeCategories: LAYER_WIZARD_CATEGORY[];
    hasLoadedWizards: boolean;
    layerWizards: LayerWizardWithMeta[];
    selectedCategory: LAYER_WIZARD_CATEGORY | null;
}
export declare class LayerWizardSelect extends Component<Props, State> {
    private _isMounted;
    state: {
        activeCategories: never[];
        hasLoadedWizards: boolean;
        layerWizards: never[];
        selectedCategory: null;
    };
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadLayerWizards(): Promise<void>;
    _filterByCategory(category: LAYER_WIZARD_CATEGORY | null): void;
    _renderCategoryFacets(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
