import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { OnFileSelectParameters } from './geo_file_picker';
interface Props {
    geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE;
    indexName: string;
    indexNameError?: string;
    indexSettings: string;
    smallChunks: boolean;
    onFileClear: () => void;
    onFileSelect: (onFileSelectParameters: OnFileSelectParameters) => void;
    onGeoFieldTypeSelect: (geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE) => void;
    onIndexNameChange: (name: string, error?: string) => void;
    onIndexNameValidationStart: () => void;
    onIndexNameValidationEnd: () => void;
    onIndexSettingsChange: (indexSettings: string) => void;
    onSmallChunksChange: (smallChunks: boolean) => void;
}
interface State {
    hasFile: boolean;
    isPointsOnly: boolean;
}
export declare class GeoUploadForm extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _onFileSelect: (onFileSelectParameters: OnFileSelectParameters) => Promise<void>;
    _onFileClear: () => void;
    _onGeoFieldTypeSelect: (event: ChangeEvent<HTMLSelectElement>) => void;
    _onSmallChunksChange: (event: EuiSwitchEvent) => void;
    _renderGeoFieldTypeSelect(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
