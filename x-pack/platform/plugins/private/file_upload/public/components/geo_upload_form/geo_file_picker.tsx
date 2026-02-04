/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiFilePicker, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MB } from '@kbn/file-upload-common/src/constants';
import { FileUploadTelemetryService } from '@kbn/file-upload-common';
import { GEO_FILE_TYPES, geoImporterFactory } from '../../importer/geo';
import type { GeoFileImporter, GeoFilePreview } from '../../importer/geo';
import { hasSidecarFiles } from '../utils';

export type OnFileSelectParameters = GeoFilePreview & {
  indexName: string;
  importer: GeoFileImporter;
  getFilesTelemetry: () => {
    total_files: number;
    total_size_bytes: number;
    main_file_size: number;
    main_file_extension: string;
    sidecar_files: Array<{ size: number; extension: string }>;
  };
};

interface Props {
  onSelect: (onFileSelectParameters: OnFileSelectParameters) => void;
  onClear: () => void;
}

interface State {
  defaultIndexName: string | null;
  error: string | null;
  isLoadingPreview: boolean;
  importer: GeoFileImporter | null;
  previewSummary: string | null;
  file: File | null;
}

export class GeoFilePicker extends Component<Props, State> {
  private _isMounted = false;

  state: State = {
    defaultIndexName: null,
    error: null,
    isLoadingPreview: false,
    importer: null,
    previewSummary: null,
    file: null,
  };

  async componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _onFileSelect = (files: FileList | null) => {
    this.props.onClear();

    this.setState({
      defaultIndexName: null,
      error: null,
      isLoadingPreview: false,
      importer: null,
      previewSummary: null,
      file: null,
    });

    if (files && files.length) {
      const file = files[0];
      try {
        const importer = geoImporterFactory(file);
        this.setState(
          {
            defaultIndexName: file.name.split('.')[0].toLowerCase(),
            importer,
            file,
          },
          this._loadFilePreview
        );
      } catch (error) {
        this.setState({ error: error.message });
      }
    }
  };

  _loadFilePreview = async () => {
    if (!this.state.importer || !this.state.importer.canPreview()) {
      return;
    }

    this.setState({ isLoadingPreview: true });

    let previewError: string | null = null;
    let preview: GeoFilePreview | null = null;
    try {
      preview = await this.state.importer.previewFile(10000, MB * 3);
      if (preview.features.length === 0) {
        previewError = i18n.translate('xpack.fileUpload.geoFilePicker.noFeaturesDetected', {
          defaultMessage: 'No features found in selected file.',
        });
      }
    } catch (error) {
      previewError = error.message;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      error: previewError,
      isLoadingPreview: false,
      previewSummary:
        !previewError && preview
          ? i18n.translate('xpack.fileUpload.geoFilePicker.previewSummary', {
              defaultMessage: 'Previewing {numFeatures} features, {previewCoverage}% of file.',
              values: {
                numFeatures: preview.features.length,
                previewCoverage: preview.previewCoverage,
              },
            })
          : null,
    });

    if (preview && this.state.importer && this.state.file) {
      this.props.onSelect({
        ...preview,
        importer: this.state.importer,
        indexName: this.state.defaultIndexName ? this.state.defaultIndexName : 'features',
        getFilesTelemetry: () => {
          const mainFile = this.state.file!;
          const mainFileExtension = FileUploadTelemetryService.getFileExtension(mainFile.name);

          // Get sidecar files if available
          const sidecarFiles = hasSidecarFiles(this.state.importer)
            ? this.state.importer.getSidecarFiles?.() ?? []
            : [];

          const totalFiles = 1 + sidecarFiles.length;
          const totalSize =
            mainFile.size + sidecarFiles.reduce((total, file) => total + file.size, 0);

          return {
            total_files: totalFiles,
            total_size_bytes: totalSize,
            main_file_size: mainFile.size,
            main_file_extension: mainFileExtension,
            sidecar_files: sidecarFiles.map((file) => ({
              size: file.size,
              extension: FileUploadTelemetryService.getFileExtension(file.name),
            })),
          };
        },
      });
    }
  };

  _renderHelpText() {
    return this.state.previewSummary !== null ? (
      this.state.previewSummary
    ) : (
      <span>
        {i18n.translate('xpack.fileUpload.geoFilePicker.acceptedFormats', {
          defaultMessage: 'Formats accepted: {fileTypes}',
          values: { fileTypes: GEO_FILE_TYPES.join(', ') },
        })}
      </span>
    );
  }

  _renderImporterEditor() {
    return this.state.importer ? this.state.importer.renderEditor(this._loadFilePreview) : null;
  }

  render() {
    return (
      <>
        <EuiFormRow
          isInvalid={!!this.state.error}
          error={!!this.state.error ? [this.state.error] : []}
          helpText={this._renderHelpText()}
        >
          <EuiFilePicker
            isInvalid={!!this.state.error}
            initialPromptText={i18n.translate('xpack.fileUpload.geoFilePicker.filePicker', {
              defaultMessage: 'Select or drag and drop a file',
            })}
            onChange={this._onFileSelect}
            accept={GEO_FILE_TYPES.join(',')}
            isLoading={this.state.isLoadingPreview}
            data-test-subj="geoFilePicker"
          />
        </EuiFormRow>
        {this._renderImporterEditor()}
      </>
    );
  }
}
