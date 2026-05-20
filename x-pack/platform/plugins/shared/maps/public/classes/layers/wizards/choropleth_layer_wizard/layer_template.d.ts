import React, { Component } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataViewField, DataView } from '@kbn/data-plugin/common';
import type { RenderWizardArguments } from '../layer_wizard_registry';
export declare enum BOUNDARIES_SOURCE {
    ELASTICSEARCH = "ELASTICSEARCH",
    EMS = "EMS"
}
interface State {
    leftSource: BOUNDARIES_SOURCE;
    leftEmsFileId: string | null;
    leftEmsFields: Array<EuiComboBoxOptionOption<string>>;
    leftIndexPattern: DataView | null;
    leftGeoFields: DataViewField[];
    leftJoinFields: DataViewField[];
    leftGeoField: string | null;
    leftEmsJoinField: string | null;
    leftElasticsearchJoinField: string | null;
    rightIndexPatternId: string;
    rightTermsFields: DataViewField[];
    rightJoinField: string | null;
}
export declare class LayerTemplate extends Component<RenderWizardArguments, State> {
    private _isMounted;
    state: {
        leftSource: BOUNDARIES_SOURCE;
        leftEmsFileId: null;
        leftEmsFields: never[];
        leftIndexPattern: null;
        leftGeoFields: never[];
        leftJoinFields: never[];
        leftGeoField: null;
        leftEmsJoinField: null;
        leftElasticsearchJoinField: null;
        rightIndexPatternId: string;
        rightTermsFields: never[];
        rightJoinField: null;
    };
    componentWillUnmount(): void;
    componentDidMount(): void;
    _loadRightFields: (indexPatternId: string) => Promise<void>;
    _loadEmsFileFields: () => Promise<void>;
    _onLeftSourceChange: (optionId: string) => void;
    _onLeftIndexPatternChange: (indexPattern: DataView) => void;
    _onLeftGeoFieldSelect: (geoField?: string) => void;
    _onLeftJoinFieldSelect: (joinField?: string) => void;
    _onLeftEmsFileChange: (emFileId: string) => void;
    _onLeftEmsFieldChange: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
    _onRightIndexPatternChange: (indexPatternId?: string) => void;
    _onRightJoinFieldSelect: (joinField?: string) => void;
    _isLeftConfigComplete(): boolean;
    _isRightConfigComplete(): false;
    _previewLayer(): void;
    _renderLeftSourceForm(): React.JSX.Element;
    _renderLeftPanel(): React.JSX.Element;
    _renderRightPanel(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
