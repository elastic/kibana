import React, { Component } from 'react';
import type { RenderWizardArguments } from '../../layer_wizard_registry';
import type { IndexPatternMeta } from './security_index_pattern_utils';
interface State {
    indexPatternId: string | null;
    indexPatternTitle: string | null;
}
export declare class SecurityLayerTemplate extends Component<RenderWizardArguments, State> {
    state: {
        indexPatternId: null;
        indexPatternTitle: null;
    };
    _onIndexPatternChange: (indexPatternMeta: IndexPatternMeta | null) => void;
    _previewLayer(): void;
    render(): React.JSX.Element;
}
export {};
