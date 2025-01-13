/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import { FeatureCollection } from 'geojson';
import { EuiPanel } from '@elastic/eui';
import { FileUploadGeoResults } from '@kbn/file-upload-plugin/public';
import { SCALING_TYPES } from '../../../../../common/constants';
import { GeoJsonFileSource } from '../../../sources/geojson_file_source';
import { GeoJsonVectorLayer } from '../../vector_layer';
import { createDefaultLayerDescriptor } from '../../../sources/es_search_source';
import { RenderWizardArguments } from '../layer_wizard_registry';
import { getFileUploadComponent } from '../../../../kibana_services';

export enum UPLOAD_STEPS {
  CONFIGURE_UPLOAD = 'CONFIGURE_UPLOAD',
  UPLOAD = 'UPLOAD',
  ADD_DOCUMENT_LAYER = 'ADD_DOCUMENT_LAYER',
}

enum INDEXING_STAGE {
  CONFIGURE = 'CONFIGURE',
  TRIGGERED = 'TRIGGERED',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

interface State {
  indexingStage: INDEXING_STAGE;
  results?: FileUploadGeoResults;
}

export class ClientFileCreateSourceEditor extends Component<RenderWizardArguments, State> {
  private _isMounted: boolean = false;

  state: State = {
    indexingStage: INDEXING_STAGE.CONFIGURE,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    if (
      this.props.currentStepId === UPLOAD_STEPS.UPLOAD &&
      this.state.indexingStage === INDEXING_STAGE.CONFIGURE
    ) {
      this.setState({ indexingStage: INDEXING_STAGE.TRIGGERED });
      this.props.startStepLoading();
      return;
    }

    if (
      this.props.isOnFinalStep &&
      this.state.indexingStage === INDEXING_STAGE.SUCCESS &&
      this.state.results
    ) {
      this._addDocumentLayer(this.state.results);
    }
  }

  _addDocumentLayer = _.once((results: FileUploadGeoResults) => {
    const esSearchSourceConfig = {
      indexPatternId: results.indexPatternId,
      geoField: results.geoFieldName,
      scalingType: SCALING_TYPES.MVT,
    };
    this.props.previewLayers([
      createDefaultLayerDescriptor(esSearchSourceConfig, this.props.mapColors),
    ]);
    this.props.advanceToNextStep();
  });

  _onFileSelect = (geojsonFile: FeatureCollection, name: string, previewCoverage: number) => {
    if (!this._isMounted) {
      return;
    }

    if (!geojsonFile) {
      this.props.previewLayers([]);
      return;
    }

    const areResultsTrimmed = previewCoverage < 100;
    const sourceDescriptor = GeoJsonFileSource.createDescriptor({
      __featureCollection: geojsonFile,
      areResultsTrimmed,
      tooltipContent: areResultsTrimmed
        ? i18n.translate('xpack.maps.fileUpload.trimmedResultsMsg', {
            defaultMessage: `Results limited to {numFeatures} features, {previewCoverage}% of file.`,
            values: {
              numFeatures: geojsonFile.features.length.toLocaleString(),
              previewCoverage,
            },
          })
        : null,
      name,
    });
    const layerDescriptor = GeoJsonVectorLayer.createDescriptor(
      { sourceDescriptor },
      this.props.mapColors
    );
    this.props.previewLayers([layerDescriptor]);
  };

  _onFileClear = () => {
    this.props.previewLayers([]);
  };

  _onUploadComplete = (results: FileUploadGeoResults) => {
    if (!this._isMounted) {
      return;
    }

    this.setState({ results });
    this.setState({ indexingStage: INDEXING_STAGE.SUCCESS });
    this.props.advanceToNextStep();
    this.props.enableNextBtn();
  };

  _onUploadError = () => {
    if (!this._isMounted) {
      return;
    }

    this.props.stopStepLoading();
    this.props.disableNextBtn();

    this.setState({ indexingStage: INDEXING_STAGE.ERROR });
  };

  render() {
    const FileUpload = getFileUploadComponent();

    return (
      <EuiPanel>
        <FileUpload
          isIndexingTriggered={this.state.indexingStage === INDEXING_STAGE.TRIGGERED}
          onFileSelect={this._onFileSelect}
          onFileClear={this._onFileClear}
          enableImportBtn={this.props.enableNextBtn}
          disableImportBtn={this.props.disableNextBtn}
          onUploadComplete={this._onUploadComplete}
          onUploadError={this._onUploadError}
        />
      </EuiPanel>
    );
  }
}
