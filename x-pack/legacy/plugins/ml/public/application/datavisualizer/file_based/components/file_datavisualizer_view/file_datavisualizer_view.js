/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { FormattedMessage } from '@kbn/i18n/react';
import React, {
  Component
} from 'react';

import {
  EuiSpacer,
} from '@elastic/eui';

import { isEqual } from 'lodash';

import { ml } from '../../../../services/ml_api_service';
import { AboutPanel, LoadingPanel } from '../about_panel';
import { BottomBar } from '../bottom_bar';
import { ResultsView } from '../results_view';
import { FileCouldNotBeRead, FileTooLarge } from './file_error_callouts';
import { EditFlyout } from '../edit_flyout';
import { ImportView } from '../import_view';
import { MAX_BYTES } from '../../../../../../common/constants/file_datavisualizer';
import {
  readFile,
  createUrlOverrides,
  processResults,
  reduceData,
  hasImportPermission,
} from '../utils';
import { MODE } from './constants';

const UPLOAD_SIZE_MB = 5;

export class FileDataVisualizerView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      files: {},
      fileContents: '',
      fileSize: 0,
      fileTooLarge: false,
      fileCouldNotBeRead: false,
      serverErrorMessage: '',
      loading: false,
      loaded: false,
      results: undefined,
      mode: MODE.READ,
      isEditFlyoutVisible: false,
      bottomBarVisible: false,
      hasPermissionToImport: false,
    };

    this.overrides = {};
    this.previousOverrides = {};
    this.originalSettings = {};
  }

  async componentDidMount() {
    // check the user has the correct permission to import data.
    // note, calling hasImportPermission with no arguments just checks the
    // cluster privileges, the user will still need index privileges to create and ingest
    const hasPermissionToImport = await hasImportPermission();
    this.setState({ hasPermissionToImport });
  }

  onFilePickerChange = (files) => {
    this.overrides = {};

    this.setState({
      loading: (files.length > 0),
      bottomBarVisible: (files.length > 0),
      loaded: false,
      fileContents: '',
      fileSize: 0,
      fileTooLarge: false,
      fileCouldNotBeRead: false,
      serverErrorMessage: '',
      results: undefined,
    }, () => {
      if (files.length) {
        this.loadFile(files[0]);
      }
    });
  };

  async loadFile(file) {
    if (file.size <= MAX_BYTES) {
      try {
        const fileContents = await readFile(file);
        const data = fileContents.data;
        this.setState({
          fileContents: data,
          fileSize: file.size,
        });

        await this.loadSettings(data);

      } catch (error) {
        console.error(error);
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
        fileSize: file.size,
      });
    }
  }

  async loadSettings(data, overrides, isRetry = false) {
    try {
      // reduce the amount of data being sent to the endpoint
      // 5MB should be enough to contain 1000 lines
      const lessData = reduceData(data, UPLOAD_SIZE_MB);
      console.log('overrides', overrides);
      const { analyzeFile } = ml.fileDatavisualizer;
      const resp = await analyzeFile(lessData, overrides);
      const serverSettings = processResults(resp.results);
      const serverOverrides = resp.overrides;

      this.previousOverrides = this.overrides;
      this.overrides = {};

      if (serverSettings.format === 'xml') {
        throw {
          message: (
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.fileDatavisualizerView.xmlNotCurrentlySupportedErrorMessage"
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
          const camelCaseO = o.replace(/_\w/g, m => m[1].toUpperCase());
          this.overrides[camelCaseO] = serverOverrides[o];
        });

        // check to see if the settings from the server which haven't been overridden have changed.
        // e.g. changing the name of the time field which is also the time field
        // will cause the timestamp_field setting to change.
        // if any have changed, update the originalSettings value
        Object.keys(serverSettings).forEach((o) => {
          const value = serverSettings[o];
          if (
            (this.overrides[o] === undefined) &&
            (Array.isArray(value) && (isEqual(value, this.originalSettings[o]) === false) ||
            (value !== this.originalSettings[o]))
          ) {
            this.originalSettings[o] = value;
          }
        });
      }

      this.setState({
        results: resp.results,
        loaded: true,
        loading: false,
        fileCouldNotBeRead: isRetry,
      });
    } catch (error) {
      console.error(error);
      this.setState({
        results: undefined,
        loaded: false,
        loading: false,
        fileCouldNotBeRead: true,
        serverErrorMessage: error.message,
      });

      // as long as the previous overrides are different to the current overrides,
      // reload the results with the previous overrides
      if (overrides !== undefined && isEqual(this.previousOverrides, overrides) === false) {
        this.setState({
          loading: true,
          loaded: false,
        });
        this.loadSettings(data, this.previousOverrides, true);
      }
    }
  }

  closeEditFlyout = () => {
    this.setState({ isEditFlyoutVisible: false });
    this.showBottomBar();
  }

  showEditFlyout = () => {
    this.setState({ isEditFlyoutVisible: true });
    this.hideBottomBar();
  }

  showBottomBar = () => {
    this.setState({ bottomBarVisible: true });
  }

  hideBottomBar = () => {
    this.setState({ bottomBarVisible: false });
  }

  setOverrides = (overrides) => {
    console.log('setOverrides', overrides);
    this.setState({
      loading: true,
      loaded: false,
    }, () => {
      const formattedOverrides = createUrlOverrides(overrides, this.originalSettings);
      this.loadSettings(this.state.fileContents, formattedOverrides);
    });
  }

  changeMode = (mode) => {
    this.setState({ mode });
  }

  onCancel = () => {
    this.changeMode(MODE.READ);
    this.onFilePickerChange([]);
  }

  render() {
    const {
      loading,
      loaded,
      results,
      fileContents,
      fileSize,
      fileTooLarge,
      fileCouldNotBeRead,
      serverErrorMessage,
      mode,
      isEditFlyoutVisible,
      bottomBarVisible,
      hasPermissionToImport,
    } = this.state;

    const fields = (results !== undefined && results.field_stats !== undefined) ? Object.keys(results.field_stats) : [];

    return (
      <div className="file-datavisualizer__content">
        {(mode === MODE.READ) &&
          <React.Fragment>

            {(!loading && !loaded) &&
              <AboutPanel
                onFilePickerChange={this.onFilePickerChange}
              />
            }

            {(loading) &&
              <LoadingPanel />
            }

            {(fileTooLarge) &&
              <FileTooLarge
                fileSize={fileSize}
                maxFileSize={MAX_BYTES}
              />
            }

            {(fileCouldNotBeRead && loading === false) &&
              <React.Fragment>
                <FileCouldNotBeRead
                  error={serverErrorMessage}
                  loaded={loaded}
                />
                <EuiSpacer size="l" />
              </React.Fragment>
            }

            {(loaded) &&
              <ResultsView
                results={results}
                data={fileContents}
                showEditFlyout={() => this.showEditFlyout()}
              />
            }
            <EditFlyout
              setOverrides={this.setOverrides}
              closeEditFlyout={this.closeEditFlyout}
              isFlyoutVisible={isEditFlyoutVisible}
              originalSettings={this.originalSettings}
              overrides={this.overrides}
              fields={fields}
            />

            {(bottomBarVisible && loaded) && <BottomBar
              mode={MODE.READ}
              onChangeMode={this.changeMode}
              onCancel={this.onCancel}
              disableImport={(hasPermissionToImport === false)}
            />}

            <BottomPadding />
          </React.Fragment>
        }
        {(mode === MODE.IMPORT) &&
          <React.Fragment>
            <ImportView
              results={results}
              fileContents={fileContents}
              fileSize={fileSize}
              indexPatterns={this.props.indexPatterns}
              kibanaConfig={this.props.kibanaConfig}
              showBottomBar={this.showBottomBar}
              hideBottomBar={this.hideBottomBar}
            />

            {bottomBarVisible && <BottomBar
              mode={MODE.IMPORT}
              onChangeMode={this.changeMode}
              onCancel={this.onCancel}
            />}

            <BottomPadding />
          </React.Fragment>
        }
      </div>
    );
  }
}

function BottomPadding() {
  // padding for the BottomBar
  return (
    <React.Fragment>
      <EuiSpacer size="m" />
      <EuiSpacer size="l" />
      <EuiSpacer size="l" />
    </React.Fragment>
  );
}
