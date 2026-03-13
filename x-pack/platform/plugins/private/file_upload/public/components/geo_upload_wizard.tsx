/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiProgress, EuiText } from '@elastic/eui';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { ImportResults } from '@kbn/file-upload-common';
import { FileUploadTelemetryService } from '@kbn/file-upload-common';
import { getDataViewsService } from '../kibana_services';
import type { OnFileSelectParameters } from './geo_upload_form';
import { GeoUploadForm } from './geo_upload_form';
import { ImportCompleteView } from './import_complete_view';
import type { GeoUploadWizardProps, FileUploadGeoResults } from '../lazy_load_bundle';
import type { GeoFileImporter } from '../importer/geo';
import { hasImportPermission } from '../api';
import { getPartialImportMessage } from './utils';

enum PHASE {
  CONFIGURE = 'CONFIGURE',
  IMPORT = 'IMPORT',
  COMPLETE = 'COMPLETE',
}

function getWritingToIndexMsg(progress: number) {
  return i18n.translate('xpack.fileUpload.geoUploadWizard.writingToIndex', {
    defaultMessage: 'Writing to index: {progress}% complete',
    values: { progress },
  });
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

export class GeoUploadWizard extends Component<GeoUploadWizardProps, State> {
  private _geoFileImporter?: GeoFileImporter;
  private _isMounted = false;
  private _telemetryService?: FileUploadTelemetryService;
  private _uploadSessionId: string = '';
  private _fileId: string = '';
  private _sessionStartTime: number = 0;
  private _sessionTelemetryTracked: boolean = false;
  private _sidecarFileIds: string[] = [];
  private _getFilesTelemetry?: () => {
    total_files: number;
    total_size_bytes: number;
    main_file_size: number;
    main_file_extension: string;
    sidecar_files: Array<{ size: number; extension: string }>;
  };

  state: State = {
    failedPermissionCheck: false,
    geoFieldType: ES_FIELD_TYPES.GEO_SHAPE,
    importStatus: '',
    indexName: '',
    indexSettings: JSON.stringify({}, null, 2),
    phase: PHASE.CONFIGURE,
    smallChunks: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._uploadSessionId = FileUploadTelemetryService.generateId();
    this._fileId = FileUploadTelemetryService.generateId();
    this._telemetryService = new FileUploadTelemetryService(
      this.props.analytics,
      this.props.location
    );
  }

  componentWillUnmount() {
    this._isMounted = false;

    // Track cancel action
    if (
      this._telemetryService &&
      this._getFilesTelemetry &&
      this._sessionStartTime > 0 &&
      !this._sessionTelemetryTracked &&
      (this.state.phase === PHASE.IMPORT || this.state.phase === PHASE.CONFIGURE)
    ) {
      // Get documents that were uploaded before cancellation
      const currentStats = this._geoFileImporter?.getCurrentImportStats();
      const cancelledImportResults = {
        success: false,
        failures: currentStats?.failures ?? [],
        docCount: currentStats?.docCount ?? 0,
      };
      const sessionTimeMs = this._getSessionTimeMs();
      this._trackUploadSession(false, false, sessionTimeMs, true);
      this._trackUploadFiles(cancelledImportResults, sessionTimeMs, false, true);
    }

    if (this._geoFileImporter) {
      this._geoFileImporter.destroy();
      this._geoFileImporter = undefined;
    }
  }

  componentDidUpdate() {
    if (this.props.isIndexingTriggered && this.state.phase === PHASE.CONFIGURE) {
      this._import();
    }
  }

  private _getSessionTimeMs(): number {
    return this._sessionStartTime > 0 ? Date.now() - this._sessionStartTime : 0;
  }

  private _trackUploadFiles(
    importResults: ImportResults,
    uploadTimeMs: number,
    uploadSuccess: boolean,
    uploadCancelled: boolean = false
  ) {
    if (!this._telemetryService || !this._getFilesTelemetry) {
      return;
    }

    const filesTelemetry = this._getFilesTelemetry();
    const documentsFailed = importResults.failures?.length ?? 0;
    const documentsSuccess =
      importResults.docCount !== undefined ? importResults.docCount - documentsFailed : 0;

    // Track main file upload event
    this._telemetryService.trackUploadFile({
      upload_session_id: this._uploadSessionId,
      file_id: this._fileId,
      mapping_clash_new_fields: 0, // Geo files don't have mapping clashes
      mapping_clash_missing_fields: 0,
      file_size_bytes: filesTelemetry.main_file_size,
      documents_success: documentsSuccess,
      documents_failed: documentsFailed,
      upload_success: uploadSuccess,
      upload_cancelled: uploadCancelled,
      upload_time_ms: uploadTimeMs,
      file_extension: filesTelemetry.main_file_extension,
    });

    // Track telemetry for each sidecar file
    if (this._sidecarFileIds.length > 0) {
      this._sidecarFileIds.forEach((sidecarFileId, index) => {
        const sidecarData = filesTelemetry.sidecar_files[index];
        this._telemetryService!.trackUploadFile({
          upload_session_id: this._uploadSessionId,
          file_id: sidecarFileId,
          mapping_clash_new_fields: 0, // Sidecar files don't have mapping clashes
          mapping_clash_missing_fields: 0,
          file_size_bytes: sidecarData.size,
          documents_success: 0, // Sidecar files don't produce documents
          documents_failed: 0,
          upload_success: uploadSuccess, // Same success status as main file
          upload_cancelled: uploadCancelled,
          upload_time_ms: 0, // Sidecar files don't have separate upload time
          file_extension: sidecarData.extension,
        });
      });
    }
  }

  private _trackUploadSession(
    sessionSuccess: boolean,
    dataViewCreated: boolean,
    sessionTimeMs: number,
    cancelled: boolean = false
  ) {
    if (!this._telemetryService || !this._getFilesTelemetry || this._sessionTelemetryTracked) {
      return;
    }

    this._sessionTelemetryTracked = true;

    const filesTelemetry = this._getFilesTelemetry();

    this._telemetryService.trackUploadSession({
      upload_session_id: this._uploadSessionId,
      total_files: filesTelemetry.total_files,
      total_size_bytes: filesTelemetry.total_size_bytes,
      session_success: sessionSuccess,
      session_cancelled: cancelled,
      session_time_ms: sessionTimeMs,
      new_index_created: true,
      data_view_created: dataViewCreated,
      mapping_clash_total_new_fields: 0,
      mapping_clash_total_missing_fields: 0,
      contains_auto_added_semantic_text_field: false,
    });
  }

  _import = async () => {
    if (!this._geoFileImporter) {
      return;
    }

    const uploadStartTime = Date.now();
    this._sessionStartTime = uploadStartTime;

    let indexSettings = {};
    try {
      indexSettings = JSON.parse(this.state.indexSettings);
    } catch (error) {
      // allow user to fix index setting parse error in editor
      return;
    }

    //
    // check permissions
    //
    const canImport = await hasImportPermission({
      checkCreateDataView: true,
      checkHasManagePipeline: false,
      indexName: this.state.indexName,
    });
    if (!this._isMounted) {
      return;
    }
    if (!canImport) {
      this.setState({
        phase: PHASE.COMPLETE,
        failedPermissionCheck: true,
      });
      this.props.onUploadError();
      return;
    }

    //
    // create index
    //
    const mappings = {
      properties: {
        geometry: {
          type: this.state.geoFieldType,
        },
      },
    };

    this.setState({
      importStatus: i18n.translate('xpack.fileUpload.geoUploadWizard.dataIndexingStarted', {
        defaultMessage: 'Creating index: {indexName}',
        values: { indexName: this.state.indexName },
      }),
      phase: PHASE.IMPORT,
    });
    this._geoFileImporter.setGeoFieldType(this.state.geoFieldType);
    const initializeImportResp = await this._geoFileImporter.initializeImport(
      this.state.indexName,
      indexSettings,
      mappings,
      []
    );
    if (!this._isMounted) {
      return;
    }
    if (initializeImportResp.index === undefined || initializeImportResp.id === undefined) {
      this.setState({
        phase: PHASE.COMPLETE,
        importResults: initializeImportResp,
      });
      this.props.onUploadError();
      return;
    }

    //
    // import file
    //
    this.setState({
      importStatus: getWritingToIndexMsg(0),
    });
    this._geoFileImporter.setSmallChunks(this.state.smallChunks);
    const importResults = await this._geoFileImporter.import(
      this.state.indexName,
      initializeImportResp.pipelineIds[0],
      (progress) => {
        if (this._isMounted) {
          this.setState({
            importStatus: getWritingToIndexMsg(progress),
          });
        }
      }
    );
    if (!this._isMounted) {
      return;
    }

    const uploadTimeMs = Date.now() - uploadStartTime;

    if (!importResults.success) {
      this._trackUploadSession(false, false, uploadTimeMs);
      this._trackUploadFiles(importResults, uploadTimeMs, false);
      this.setState({
        importResults,
        importStatus: i18n.translate('xpack.fileUpload.geoUploadWizard.dataIndexingError', {
          defaultMessage: 'Data indexing error',
        }),
        phase: PHASE.COMPLETE,
      });
      this.props.onUploadError();
      return;
    } else if (importResults.docCount === importResults.failures?.length) {
      this._trackUploadSession(false, false, uploadTimeMs);
      this._trackUploadFiles(importResults, uploadTimeMs, false);
      this.setState({
        // Force importResults into failure shape when no features are indexed
        importResults: {
          ...importResults,
          success: false,
          error: {
            error: {
              reason: getPartialImportMessage(
                importResults.failures!.length,
                importResults.docCount
              ),
            },
          },
        },
        phase: PHASE.COMPLETE,
      });
      this.props.onUploadError();
      return;
    }

    //
    // create index pattern
    //
    this.setState({
      importResults,
      importStatus: i18n.translate('xpack.fileUpload.geoUploadWizard.creatingDataView', {
        defaultMessage: 'Creating data view: {indexName}',
        values: { indexName: this.state.indexName },
      }),
    });
    let dataView;
    let results: FileUploadGeoResults | undefined;
    try {
      dataView = await getDataViewsService().createAndSave(
        {
          title: this.state.indexName,
        },
        true
      );
      if (!dataView.id) {
        throw new Error('id not provided');
      }
      const geoField = dataView.fields.find((field) =>
        [ES_FIELD_TYPES.GEO_POINT as string, ES_FIELD_TYPES.GEO_SHAPE as string].includes(
          field.type
        )
      );
      if (!geoField) {
        throw new Error('geo field not created');
      }
      results = {
        indexPatternId: dataView.id,
        geoFieldName: geoField.name,
        geoFieldType: geoField.type as ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE,
        docCount: importResults.docCount !== undefined ? importResults.docCount : 0,
      };
    } catch (error) {
      const sessionTimeMs = this._getSessionTimeMs();
      this._trackUploadSession(false, false, sessionTimeMs);
      this._trackUploadFiles(importResults, uploadTimeMs, false);
      if (this._isMounted) {
        this.setState({
          importStatus: i18n.translate('xpack.fileUpload.geoUploadWizard.dataViewError', {
            defaultMessage: 'Unable to create data view',
          }),
          phase: PHASE.COMPLETE,
        });
        this.props.onUploadError();
      }
      return;
    }
    if (!this._isMounted) {
      return;
    }

    const sessionTimeMs = this._getSessionTimeMs();
    this._trackUploadSession(true, true, sessionTimeMs);
    this._trackUploadFiles(importResults, uploadTimeMs, true);

    //
    // Successful import
    //
    this.setState({
      dataViewResp: {
        success: true,
        id: dataView.id,
        fields: dataView.fields,
      },
      phase: PHASE.COMPLETE,
      importStatus: '',
    });
    this.props.onUploadComplete(results!);
  };

  _onFileSelect = ({
    features,
    importer,
    indexName,
    previewCoverage,
    getFilesTelemetry,
  }: OnFileSelectParameters) => {
    this._geoFileImporter = importer;
    this._getFilesTelemetry = getFilesTelemetry;

    // Generate IDs for sidecar files
    const filesTelemetryData = getFilesTelemetry();
    this._sidecarFileIds = filesTelemetryData.sidecar_files.map(() =>
      FileUploadTelemetryService.generateId()
    );

    this.props.onFileSelect(
      {
        type: 'FeatureCollection',
        features,
      },
      indexName,
      previewCoverage
    );
  };

  _onFileClear = () => {
    if (this._geoFileImporter) {
      this._geoFileImporter.destroy();
      this._geoFileImporter = undefined;
    }
    this._getFilesTelemetry = undefined;
    this._sidecarFileIds = [];

    this.props.onFileClear();
  };

  _onGeoFieldTypeSelect = (geoFieldType: ES_FIELD_TYPES.GEO_POINT | ES_FIELD_TYPES.GEO_SHAPE) => {
    this.setState({ geoFieldType });
  };

  _onIndexNameChange = (name: string, error?: string) => {
    this.setState({
      indexName: name,
      indexNameError: error,
    });

    const isReadyToImport = !!name && error === undefined;
    if (isReadyToImport) {
      this.props.enableImportBtn();
    } else {
      this.props.disableImportBtn();
    }
  };

  _onIndexSettingsChange = (indexSettings: string) => {
    this.setState({ indexSettings });
    try {
      JSON.parse(indexSettings);
      this.props.enableImportBtn();
    } catch (error) {
      this.props.disableImportBtn();
    }
  };

  _onSmallChunksChange = (smallChunks: boolean) => {
    this.setState({ smallChunks });
  };

  render() {
    if (this.state.phase === PHASE.IMPORT) {
      return (
        <Fragment>
          <EuiProgress size="xs" color="accent" position="absolute" />
          <EuiText>
            <p>{this.state.importStatus}</p>
          </EuiText>
        </Fragment>
      );
    }

    if (this.state.phase === PHASE.COMPLETE) {
      return (
        <ImportCompleteView
          importResults={this.state.importResults}
          dataViewResp={this.state.dataViewResp}
          indexName={this.state.indexName}
          failedPermissionCheck={this.state.failedPermissionCheck}
        />
      );
    }

    return (
      <GeoUploadForm
        geoFieldType={this.state.geoFieldType}
        indexName={this.state.indexName}
        indexNameError={this.state.indexNameError}
        indexSettings={this.state.indexSettings}
        onFileClear={this._onFileClear}
        onFileSelect={this._onFileSelect}
        smallChunks={this.state.smallChunks}
        onGeoFieldTypeSelect={this._onGeoFieldTypeSelect}
        onIndexNameChange={this._onIndexNameChange}
        onIndexNameValidationStart={this.props.disableImportBtn}
        onIndexNameValidationEnd={this.props.enableImportBtn}
        onIndexSettingsChange={this._onIndexSettingsChange}
        onSmallChunksChange={this._onSmallChunksChange}
      />
    );
  }
}
