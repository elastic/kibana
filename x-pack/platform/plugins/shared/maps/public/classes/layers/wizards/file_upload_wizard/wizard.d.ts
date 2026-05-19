import React, { Component } from 'react';
import type { FeatureCollection } from 'geojson';
import type { FileUploadGeoResults } from '@kbn/file-upload-plugin/public';
import type { RenderWizardArguments } from '../layer_wizard_registry';
export declare enum UPLOAD_STEPS {
    CONFIGURE_UPLOAD = "CONFIGURE_UPLOAD",
    UPLOAD = "UPLOAD",
    ADD_DOCUMENT_LAYER = "ADD_DOCUMENT_LAYER"
}
declare enum INDEXING_STAGE {
    CONFIGURE = "CONFIGURE",
    TRIGGERED = "TRIGGERED",
    SUCCESS = "SUCCESS",
    ERROR = "ERROR"
}
interface State {
    indexingStage: INDEXING_STAGE;
    results?: FileUploadGeoResults;
}
export declare class ClientFileCreateSourceEditor extends Component<RenderWizardArguments, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
    _addDocumentLayer: (results: FileUploadGeoResults) => void;
    _onFileSelect: (geojsonFile: FeatureCollection, name: string, previewCoverage: number) => void;
    _onFileClear: () => void;
    _onUploadComplete: (results: FileUploadGeoResults) => void;
    _onUploadError: () => void;
    render(): React.JSX.Element;
}
export {};
