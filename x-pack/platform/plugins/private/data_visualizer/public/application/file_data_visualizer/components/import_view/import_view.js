/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { Component } from 'react';

import {
  EuiButton,
  EuiPageBody,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';

import { debounce } from 'lodash';
import { context } from '@kbn/kibana-react-plugin/public';
import { ResultsLinks } from '../../../common/components/results_links';
import { FilebeatConfigFlyout } from '../../../common/components/filebeat_config_flyout';
import { ImportProgress, IMPORT_STATUS } from '../import_progress';
import { ImportErrors } from '../import_errors';
import { ImportSummary } from '../import_summary';
import { ImportSettings } from '../import_settings';
import { DocCountChart } from '../doc_count_chart';
import {
  addCombinedFieldsToPipeline,
  addCombinedFieldsToMappings,
  getDefaultCombinedFields,
} from '../../../common/components/combined_fields';
import { MODE as DATAVISUALIZER_MODE } from '../file_data_visualizer_view/constants';
import { importData } from './import';
import { FILE_FORMATS } from '../../../../../common/constants';

const DEFAULT_INDEX_SETTINGS = {};
const CONFIG_MODE = { SIMPLE: 0, ADVANCED: 1 };

const DEFAULT_STATE = {
  index: '',
  importing: false,
  imported: false,
  initialized: false,
  reading: false,
  readProgress: 0,
  readStatus: IMPORT_STATUS.INCOMPLETE,
  parseJSONStatus: IMPORT_STATUS.INCOMPLETE,
  indexCreatedStatus: IMPORT_STATUS.INCOMPLETE,
  dataViewCreatedStatus: IMPORT_STATUS.INCOMPLETE,
  ingestPipelineCreatedStatus: IMPORT_STATUS.INCOMPLETE,
  permissionCheckStatus: IMPORT_STATUS.INCOMPLETE,
  uploadProgress: 0,
  uploadStatus: IMPORT_STATUS.INCOMPLETE,
  createDataView: true,
  dataView: '',
  dataViewId: '',
  pipelineId: null,
  errors: [],
  importFailures: [],
  docCount: 0,
  configMode: CONFIG_MODE.SIMPLE,
  indexSettingsString: '',
  mappingsString: '',
  pipelineString: '',
  indexNames: [],
  dataViewNames: [],
  indexNameError: '',
  dataViewNameError: '',
  timeFieldName: undefined,
  isFilebeatFlyoutVisible: false,
  checkingValidIndex: false,
  combinedFields: [],
  importer: undefined,
  createPipeline: true,
  initializeDeployment: false,
  initializeDeploymentStatus: IMPORT_STATUS.INCOMPLETE,
  inferenceId: null,
};

export class ImportView extends Component {
  static contextType = context;

  constructor(props) {
    super(props);

    this.state = getDefaultState(DEFAULT_STATE, this.props.results, this.props.capabilities);
  }

  componentDidMount() {
    this.loadDataViewNames();
  }

  clickReset = () => {
    const state = getDefaultState(this.state, this.props.results, this.props.capabilities);
    this.setState(state, () => {
      this.loadDataViewNames();
    });
  };

  clickImport = () => {
    const { data, results } = this.props;
    const {
      data: { dataViews: dataViewsContract },
      fileUpload,
      http,
    } = this.context.services;
    const {
      index,
      dataView,
      createDataView,
      indexSettingsString,
      mappingsString,
      pipelineString,
      pipelineId,
    } = this.state;

    const createPipeline = pipelineString !== '';

    this.setState({
      createPipeline,
    });

    importData(
      { data, results, dataViewsContract, fileUpload, http },
      {
        index,
        dataView,
        createDataView,
        indexSettingsString,
        mappingsString,
        pipelineString,
        pipelineId,
        createPipeline,
      },
      (state) => this.setState(state)
    );
  };

  onConfigModeChange = (configMode) => {
    this.setState({
      configMode,
    });
  };

  onIndexChange = (index) => {
    this.setState({
      index,
      checkingValidIndex: true,
    });
    this.debounceIndexCheck(index);
  };

  debounceIndexCheck = debounce(async (index) => {
    if (index === '') {
      this.setState({ checkingValidIndex: false });
      return;
    }

    const exists = await this.context.services.fileUpload.checkIndexExists(index);
    const indexNameError = exists ? (
      <FormattedMessage
        id="xpack.dataVisualizer.file.importView.indexNameAlreadyExistsErrorMessage"
        defaultMessage="Index name already exists"
      />
    ) : (
      isIndexNameValid(index)
    );
    this.setState({ checkingValidIndex: false, indexNameError });
  }, 500);

  onDataViewChange = (e) => {
    const name = e.target.value;
    const { dataViewNames, index } = this.state;
    this.setState({
      dataView: name,
      dataViewNameError: isDataViewNameValid(name, dataViewNames, index),
    });
  };

  onCreateDataViewChange = (e) => {
    this.setState({
      createDataView: e.target.checked,
    });
  };

  onIndexSettingsStringChange = (text) => {
    this.setState({
      indexSettingsString: text,
    });
  };

  onMappingsStringChange = (text) => {
    this.setState({
      mappingsString: text,
    });
  };

  onPipelineStringChange = (text) => {
    this.setState({
      pipelineString: text,
    });
  };

  onPipelineIdChange = (text) => {
    this.setState({
      pipelineId: text,
    });
  };

  onCreatePipelineChange = (b) => {
    this.setState({
      createPipeline: b,
    });
  };

  onCombinedFieldsChange = (combinedFields) => {
    this.setState({ combinedFields });
  };

  setReadProgress = (progress) => {
    this.setState({
      readProgress: progress,
    });
  };

  showFilebeatFlyout = () => {
    this.setState({ isFilebeatFlyoutVisible: true });
  };

  closeFilebeatFlyout = () => {
    this.setState({ isFilebeatFlyoutVisible: false });
  };

  closeFilebeatFlyout = () => {
    this.setState({ isFilebeatFlyoutVisible: false });
  };

  async loadDataViewNames() {
    try {
      const dataViewNames = await this.context.services.data.dataViews.getTitles();
      this.setState({ dataViewNames });
    } catch (error) {
      console.error('failed to load data views', error);
    }
  }

  render() {
    const {
      index,
      dataView,
      dataViewId,
      pipelineId,
      importing,
      imported,
      reading,
      initialized,
      readStatus,
      parseJSONStatus,
      indexCreatedStatus,
      ingestPipelineCreatedStatus,
      dataViewCreatedStatus,
      permissionCheckStatus,
      uploadProgress,
      uploadStatus,
      createDataView,
      errors,
      docCount,
      importFailures,
      indexSettingsString,
      mappingsString,
      pipelineString,
      indexNameError,
      dataViewNameError,
      timeFieldName,
      isFilebeatFlyoutVisible,
      checkingValidIndex,
      combinedFields,
      importer,
      createPipeline,
      initializeDeployment,
      initializeDeploymentStatus,
    } = this.state;

    const statuses = {
      reading,
      readStatus,
      parseJSONStatus,
      indexCreatedStatus,
      ingestPipelineCreatedStatus,
      dataViewCreatedStatus,
      permissionCheckStatus,
      uploadProgress,
      uploadStatus,
      createDataView,
      createPipeline,
      initializeDeployment,
      initializeDeploymentStatus,
    };

    const disableImport =
      index === '' ||
      indexNameError !== '' ||
      (createDataView === true && dataViewNameError !== '') ||
      initialized === true ||
      checkingValidIndex === true;

    return (
      <EuiPageBody data-test-subj="dataVisualizerPageFileImport">
        <EuiPageHeader>
          <EuiTitle>
            <h1>{this.props.fileName}</h1>
          </EuiTitle>
        </EuiPageHeader>
        <EuiSpacer size="m" />
        {initialized === false ? (
          <EuiPanel
            data-test-subj="dataVisualizerFileImportSettingsPanel"
            hasShadow={false}
            hasBorder
          >
            <EuiTitle size="s">
              <h2>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.importView.importDataTitle"
                  defaultMessage="Import data"
                />
              </h2>
            </EuiTitle>

            <ImportSettings
              index={index}
              dataView={dataView}
              initialized={initialized}
              onIndexChange={this.onIndexChange}
              createDataView={createDataView}
              onCreateDataViewChange={this.onCreateDataViewChange}
              onDataViewChange={this.onDataViewChange}
              indexSettingsString={indexSettingsString}
              mappingsString={mappingsString}
              pipelineString={pipelineString}
              onIndexSettingsStringChange={this.onIndexSettingsStringChange}
              onMappingsStringChange={this.onMappingsStringChange}
              onPipelineStringChange={this.onPipelineStringChange}
              indexNameError={indexNameError}
              dataViewNameError={dataViewNameError}
              combinedFields={combinedFields}
              onCombinedFieldsChange={this.onCombinedFieldsChange}
              results={this.props.results}
            />

            <EuiSpacer size="m" />

            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton
                  isDisabled={disableImport}
                  onClick={this.clickImport}
                  isLoading={importing}
                  iconSide="right"
                  fill
                  data-test-subj="dataVisualizerFileImportButton"
                >
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.importView.importButtonLabel"
                    defaultMessage="Import"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => this.props.onChangeMode(DATAVISUALIZER_MODE.READ)}
                  isDisabled={importing}
                >
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.importView.backButtonLabel"
                    defaultMessage="Back"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => this.props.onCancel()} isDisabled={importing}>
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.importView.cancelButtonLabel"
                    defaultMessage="Select a different file"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        ) : null}

        {initialized === true && (
          <React.Fragment>
            <EuiSpacer size="m" />

            <EuiPanel hasShadow={false} hasBorder>
              <ImportProgress statuses={statuses} />

              {importer !== undefined &&
                importer.initialized() &&
                this.props.results.format !== FILE_FORMATS.TIKA && (
                  <DocCountChart
                    statuses={statuses}
                    dataStart={this.context.services.data}
                    importer={importer}
                  />
                )}

              {imported === true && (
                <React.Fragment>
                  <EuiSpacer size="m" />

                  <ImportSummary
                    index={index}
                    dataView={dataView === '' ? index : dataView}
                    pipelineId={pipelineId}
                    docCount={docCount}
                    importFailures={importFailures}
                    createDataView={createDataView}
                    createPipeline={createPipeline}
                  />

                  <EuiSpacer size="l" />

                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <EuiButton onClick={this.clickReset}>
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.importView.resetButtonLabel"
                          defaultMessage="Reset"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={() => this.props.onCancel()} isDisabled={importing}>
                        <FormattedMessage
                          id="xpack.dataVisualizer.file.importView.importNewButtonLabel"
                          defaultMessage="Import a new file"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiSpacer size="l" />

                  <ResultsLinks
                    results={this.props.results}
                    index={index}
                    dataViewId={dataViewId}
                    timeFieldName={timeFieldName}
                    createDataView={createDataView}
                    showFilebeatFlyout={this.showFilebeatFlyout}
                    getAdditionalLinks={this.props.getAdditionalLinks ?? []}
                    resultLinks={this.props.resultLinks}
                    combinedFields={combinedFields}
                  />

                  {isFilebeatFlyoutVisible && (
                    <FilebeatConfigFlyout
                      index={index}
                      results={this.props.results}
                      pipelineId={pipelineId}
                      closeFlyout={this.closeFilebeatFlyout}
                    />
                  )}
                </React.Fragment>
              )}
            </EuiPanel>
          </React.Fragment>
        )}
        {errors.length > 0 && (
          <React.Fragment>
            <EuiSpacer size="m" />

            <ImportErrors errors={errors} statuses={statuses} />
          </React.Fragment>
        )}
      </EuiPageBody>
    );
  }
}

function getDefaultState(state, results, capabilities) {
  const indexSettingsString =
    state.indexSettingsString === ''
      ? JSON.stringify(DEFAULT_INDEX_SETTINGS, null, 2)
      : state.indexSettingsString;

  const combinedFields = state.combinedFields.length
    ? state.combinedFields
    : getDefaultCombinedFields(results);

  const mappingsString =
    state.mappingsString === ''
      ? JSON.stringify(addCombinedFieldsToMappings(results.mappings, combinedFields), null, 2)
      : state.mappingsString;

  const pipelineString =
    state.pipelineString === '' && results.ingest_pipeline !== undefined
      ? JSON.stringify(
          addCombinedFieldsToPipeline(results.ingest_pipeline, combinedFields),
          null,
          2
        )
      : state.pipelineString;

  const timeFieldName = results.timestamp_field;

  const createDataView =
    capabilities.savedObjectsManagement.edit === false && capabilities.indexPatterns.save === false
      ? false
      : state.createDataView;

  return {
    ...DEFAULT_STATE,
    indexSettingsString,
    mappingsString,
    pipelineString,
    timeFieldName,
    combinedFields,
    createDataView,
  };
}

function isIndexNameValid(name) {
  const reg = new RegExp('[\\\\/*?"<>|\\s,#]+');
  if (
    name !== name.toLowerCase() || // name should be lowercase
    name === '.' ||
    name === '..' || // name can't be . or ..
    name.match(/^[-_+]/) !== null || // name can't start with these chars
    name.match(reg) !== null // name can't contain these chars
  ) {
    return (
      <FormattedMessage
        id="xpack.dataVisualizer.file.importView.indexNameContainsIllegalCharactersErrorMessage"
        defaultMessage="Index name contains illegal characters"
      />
    );
  }
  return '';
}

function isDataViewNameValid(name, dataViewNames, index) {
  // if a blank name is entered, the index name will be used so avoid validation
  if (name === '') {
    return '';
  }

  if (dataViewNames.find((i) => i === name)) {
    return (
      <FormattedMessage
        id="xpack.dataVisualizer.file.importView.dataViewNameAlreadyExistsErrorMessage"
        defaultMessage="Data view name already exists"
      />
    );
  }

  // escape . and + to stop the regex matching more than it should.
  let newName = name.replace(/\./g, '\\.');
  newName = newName.replace(/\+/g, '\\+');
  // replace * with .* to make the wildcard match work.
  newName = newName.replace(/\*/g, '.*');
  const reg = new RegExp(`^${newName}$`);
  if (index.match(reg) === null) {
    // name should match index
    return (
      <FormattedMessage
        id="xpack.dataVisualizer.file.importView.indexPatternDoesNotMatchDataViewErrorMessage"
        defaultMessage="Data view does not match index name"
      />
    );
  }

  return '';
}
