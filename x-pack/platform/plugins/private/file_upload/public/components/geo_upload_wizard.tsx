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
import type { FileUploadComponentProps, FileUploadGeoResults } from '../lazy_load_bundle';
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

export class GeoUploadWizard extends Component<FileUploadComponentProps, State> {
  private _geoFileImporter?: GeoFileImporter;
  private _isMounted = false;
  private _telemetryService?: FileUploadTelemetryService;
  private _uploadSessionId: string = '';
  private _fileId: string = '';
  private _sessionStartTime: number = 0;
  private _file?: File;

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

    // Initialize telemetry service if analytics and location are provided
    if (this.props.analytics && this.props.location) {
      this._telemetryService = new FileUploadTelemetryService(
        this.props.analytics,
        this.props.location
      );
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
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

  private _trackUploadSession(
    sessionSuccess: boolean,
    dataViewCreated: boolean,
    sessionTimeMs: number
  ) {
    if (!this._telemetryService || !this._file) {
      return;
    }

    this._telemetryService.trackUploadSession({
      upload_session_id: this._uploadSessionId,
      total_files: 1,
      total_size_bytes: this._file.size,
      session_success: sessionSuccess,
      session_cancelled: false,
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

    // Track file upload event
    if (this._telemetryService && this._file) {
      const fileSizeBytes = this._file.size;
      const documentsFailed = importResults.failures?.length ?? 0;
      const documentsSuccess =
        importResults.docCount !== undefined ? importResults.docCount - documentsFailed : 0;

      this._telemetryService.trackUploadFile({
        upload_session_id: this._uploadSessionId,
        file_id: this._fileId,
        mapping_clash_new_fields: 0, // Geo files don't have mapping clashes
        mapping_clash_missing_fields: 0,
        file_size_bytes: fileSizeBytes,
        documents_success: documentsSuccess,
        documents_failed: documentsFailed,
        upload_success: importResults.success,
        upload_cancelled: false,
        upload_time_ms: uploadTimeMs,
      });
    }

    if (!importResults.success) {
      this._trackUploadSession(false, false, uploadTimeMs);
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
      this._trackUploadSession(false, false, Date.now() - this._sessionStartTime);
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

    this._trackUploadSession(true, true, Date.now() - this._sessionStartTime);

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
    file,
  }: OnFileSelectParameters) => {
    this._geoFileImporter = importer;
    this._file = file;

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
    this._file = undefined;

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
