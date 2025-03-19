/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { Component } from 'react';

import { EuiSpacer } from '@elastic/eui';

import { isEqual } from 'lodash';

import { AboutPanel, LoadingPanel } from '../about_panel';
import { ResultsView } from '../results_view';
import {
  FileCouldNotBeRead,
  FileTooLarge,
  FindFileStructurePermissionDenied,
} from './file_error_callouts';
import { EditFlyout } from '../edit_flyout';
import { ExplanationFlyout } from '../explanation_flyout';
import { ImportView } from '../import_view';
import {
  DEFAULT_LINES_TO_SAMPLE,
  readFile,
  createUrlOverrides,
  processResults,
} from '../../../common/components/utils';
import { analyzeTikaFile } from './tika_analyzer';

import { MODE } from './constants';
import { FileSizeChecker } from './file_size_check';
import { isTikaType } from '../../../../../common/utils/tika_utils';

export class FileDataVisualizerView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      files: {},
      fileName: '',
      fileContents: '',
      data: [],
      base64Data: '',
      fileTooLarge: false,
      fileCouldNotBeRead: false,
      serverError: null,
      loading: false,
      loaded: false,
      results: undefined,
      explanation: undefined,
      mode: MODE.READ,
      isEditFlyoutVisible: false,
      isExplanationFlyoutVisible: false,
      hasPermissionToImport: false,
      fileCouldNotBeReadPermissionError: false,
    };

    this.overrides = {};
    this.previousOverrides = {};
    this.originalSettings = {
      linesToSample: DEFAULT_LINES_TO_SAMPLE,
    };
  }

  async componentDidMount() {
    // check the user has the correct permission to import data.
    // note, calling hasImportPermission with no arguments just checks the
    // cluster privileges, the user will still need index privileges to create and ingest
    const hasPermissionToImport = await this.props.fileUpload.hasImportPermission({
      checkCreateDataView: false,
      checkHasManagePipeline: true,
    });
    this.setState({ hasPermissionToImport });
  }

  onFilePickerChange = (files) => {
    this.overrides = {};

    this.setState(
      {
        loading: files.length > 0,
        loaded: false,
        fileName: '',
        fileContents: '',
        data: [],
        fileTooLarge: false,
        fileCouldNotBeRead: false,
        fileCouldNotBeReadPermissionError: false,
        serverError: null,
        results: undefined,
        explanation: undefined,
      },
      () => {
        if (files.length) {
          this.loadFile(files[0]);
        }
      }
    );
  };

  async loadFile(file) {
    this.fileSizeChecker = new FileSizeChecker(this.props.fileUpload, file);
    if (this.fileSizeChecker.check()) {
      try {
        const { data, fileContents } = await readFile(file);
        if (isTikaType(file.type)) {
          this.setState({
            data,
            fileName: file.name,
          });

          await this.analyzeTika(data);
        } else {
          this.setState({
            data,
            fileContents,
            fileName: file.name,
          });
          await this.analyzeFile(fileContents);
        }
      } catch (error) {
        this.setState({
          loaded: false,
          loading: false,
          fileCouldNotBeRead: true,
        });
      }
    } else {
      this.setState({
        loaded: false,
        loading: false,
        fileTooLarge: true,
        fileName: file.name,
      });
    }
  }

  async analyzeFile(fileContents, overrides, isRetry = false) {
    try {
      const resp = await this.props.fileUpload.analyzeFile(fileContents, overrides);
      const serverSettings = processResults(resp);
      const serverOverrides = resp.overrides;

      this.previousOverrides = overrides;
      this.overrides = {};

      if (serverSettings.format === 'xml') {
        throw {
          message: (
            <FormattedMessage
              id="xpack.dataVisualizer.file.xmlNotCurrentlySupportedErrorMessage"
              defaultMessage="XML not currently supported"
            />
          ),
        };
      }

      if (serverOverrides === undefined) {
        // if no overrides were used, store all the settings returned from the endpoint
        this.originalSettings = serverSettings;
      } else {
        Object.keys(serverOverrides).forEach((o) => {
          const camelCaseO = o.replace(/_\w/g, (m) => m[1].toUpperCase());
          this.overrides[camelCaseO] = serverOverrides[o];
        });

        // check to see if the settings from the server which haven't been overridden have changed.
        // e.g. changing the name of the time field which is also the time field
        // will cause the timestamp_field setting to change.
        // if any have changed, update the originalSettings value
        Object.keys(serverSettings).forEach((o) => {
          const value = serverSettings[o];
          if (
            this.overrides[o] === undefined &&
            ((Array.isArray(value) && isEqual(value, this.originalSettings[o]) === false) ||
              value !== this.originalSettings[o])
          ) {
            this.originalSettings[o] = value;
          }
        });
      }

      this.setState({
        results: resp.results,
        explanation: resp.explanation,
        loaded: true,
        loading: false,
        fileCouldNotBeRead: isRetry,
      });
    } catch (error) {
      const fileCouldNotBeReadPermissionError = error.body.statusCode === 403;
      this.setState({
        results: undefined,
        explanation: undefined,
        loaded: false,
        loading: false,
        fileCouldNotBeRead: true,
        fileCouldNotBeReadPermissionError,
        serverError: error,
      });

      // reload the results with the previous overrides
      if (isRetry === false && fileCouldNotBeReadPermissionError === false) {
        this.setState({
          loading: true,
          loaded: false,
        });
        this.analyzeFile(fileContents, this.previousOverrides, true);
      }
    }
  }

  async analyzeTika(data, isRetry = false) {
    const { tikaResults, standardResults } = await analyzeTikaFile(data, this.props.fileUpload);
    const serverSettings = processResults(standardResults);
    this.originalSettings = serverSettings;

    this.setState({
      fileContents: tikaResults.content,
      results: standardResults.results,
      explanation: standardResults.explanation,
      loaded: true,
      loading: false,
      fileCouldNotBeRead: isRetry,
    });
  }

  closeEditFlyout = () => {
    this.setState({ isEditFlyoutVisible: false });
  };

  showEditFlyout = () => {
    this.setState({ isEditFlyoutVisible: true });
  };

  closeExplanationFlyout = () => {
    this.setState({ isExplanationFlyoutVisible: false });
  };

  showExplanationFlyout = () => {
    this.setState({ isExplanationFlyoutVisible: true });
  };

  setOverrides = (overrides) => {
    this.setState(
      {
        loading: true,
        loaded: false,
      },
      () => {
        const formattedOverrides = createUrlOverrides(overrides, this.originalSettings);
        this.analyzeFile(this.state.fileContents, formattedOverrides);
      }
    );
  };

  changeMode = (mode) => {
    this.setState({ mode });
  };

  onCancel = () => {
    this.overrides = {};
    this.previousOverrides = {};
    this.originalSettings = {
      linesToSample: DEFAULT_LINES_TO_SAMPLE,
    };
    this.changeMode(MODE.READ);
    this.onFilePickerChange([]);
  };

  render() {
    const {
      loading,
      loaded,
      results,
      explanation,
      fileContents,
      data,
      fileName,
      fileTooLarge,
      fileCouldNotBeRead,
      serverError,
      mode,
      isEditFlyoutVisible,
      isExplanationFlyoutVisible,
      hasPermissionToImport,
      fileCouldNotBeReadPermissionError,
    } = this.state;

    const fields =
      results !== undefined && results.field_stats !== undefined
        ? Object.keys(results.field_stats)
        : [];

    return (
      <div>
        {mode === MODE.READ && (
          <>
            {!loading && !loaded && (
              <AboutPanel
                onFilePickerChange={this.onFilePickerChange}
                hasPermissionToImport={hasPermissionToImport}
              />
            )}

            {loading && <LoadingPanel />}

            {fileTooLarge && <FileTooLarge fileSizeChecker={this.fileSizeChecker} />}

            {fileCouldNotBeRead && loading === false && (
              <>
                {fileCouldNotBeReadPermissionError ? (
                  <FindFileStructurePermissionDenied />
                ) : (
                  <FileCouldNotBeRead
                    error={serverError}
                    loaded={loaded}
                    showEditFlyout={this.showEditFlyout}
                  />
                )}
                <EuiSpacer size="l" />
              </>
            )}

            {loaded && (
              <ResultsView
                results={results}
                explanation={explanation}
                fileName={fileName}
                fileContents={fileContents}
                showEditFlyout={this.showEditFlyout}
                showExplanationFlyout={this.showExplanationFlyout}
                disableButtons={isEditFlyoutVisible || isExplanationFlyoutVisible}
                onChangeMode={this.changeMode}
                onCancel={this.onCancel}
                disableImport={hasPermissionToImport === false}
              />
            )}
            <EditFlyout
              setOverrides={this.setOverrides}
              closeEditFlyout={this.closeEditFlyout}
              isFlyoutVisible={isEditFlyoutVisible}
              originalSettings={this.originalSettings}
              overrides={this.overrides}
              fields={fields}
            />

            {isExplanationFlyoutVisible && (
              <ExplanationFlyout results={results} closeFlyout={this.closeExplanationFlyout} />
            )}
          </>
        )}
        {mode === MODE.IMPORT && (
          <>
            <ImportView
              results={results}
              fileName={fileName}
              fileContents={fileContents}
              data={data}
              getAdditionalLinks={this.props.getAdditionalLinks}
              resultLinks={this.props.resultLinks}
              capabilities={this.props.capabilities}
              mode={mode}
              onChangeMode={this.changeMode}
              onCancel={this.onCancel}
              setUploadResults={this.props.setUploadResults}
            />
          </>
        )}
      </div>
    );
  }
}
