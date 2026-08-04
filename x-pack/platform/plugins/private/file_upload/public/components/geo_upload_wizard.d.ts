import React, { Component } from 'react';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { ImportResults } from '@kbn/file-upload-common';
import type { OnFileSelectParameters } from './geo_upload_form';
import type { GeoUploadWizardProps } from '../lazy_load_bundle';
declare enum PHASE {
    CONFIGURE = "CONFIGURE",
    IMPORT = "IMPORT",
    COMPLETE = "COMPLETE"
}
interface State {
    failedPermissionCheck: boolean;
    geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE;
    importStatus: string;
    importResults?: ImportResults;
    indexName: string;
    indexNameError?: string;
    indexSettings: string;
    dataViewResp?: object;
    phase: PHASE;
    smallChunks: boolean;
}
export declare class GeoUploadWizard extends Component<GeoUploadWizardProps, State> {
    private _geoFileImporter?;
    private _isMounted;
    private _telemetryService?;
    private _uploadSessionId;
    private _fileId;
    private _sessionStartTime;
    private _sessionTelemetryTracked;
    private _sidecarFileIds;
    private _getFilesTelemetry?;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
    private _getSessionTimeMs;
    private _trackUploadFiles;
    private _trackUploadSession;
    _import: () => Promise<void>;
    _onFileSelect: ({ features, importer, indexName, previewCoverage, getFilesTelemetry, }: OnFileSelectParameters) => void;
    _onFileClear: () => void;
    _onGeoFieldTypeSelect: (geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE) => void;
    _onIndexNameChange: (name: string, error?: string) => void;
    _onIndexSettingsChange: (indexSettings: string) => void;
    _onSmallChunksChange: (smallChunks: boolean) => void;
    render(): React.JSX.Element;
}
export {};
