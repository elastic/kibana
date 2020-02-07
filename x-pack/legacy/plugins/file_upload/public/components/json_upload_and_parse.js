/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm } from '@elastic/eui';
import PropTypes from 'prop-types';
import { indexData, createIndexPattern } from '../util/indexing_service';
import { getGeoIndexTypesForFeatures } from '../util/geo_processing';
import { IndexSettings } from './index_settings';
import { JsonIndexFilePicker } from './json_index_file_picker';
import { JsonImportProgress } from './json_import_progress';
import _ from 'lodash';

const INDEXING_STAGE = {
  INDEXING_STARTED: i18n.translate('xpack.fileUpload.jsonUploadAndParse.dataIndexingStarted', {
    defaultMessage: 'Data indexing started',
  }),
  WRITING_TO_INDEX: i18n.translate('xpack.fileUpload.jsonUploadAndParse.writingToIndex', {
    defaultMessage: 'Writing to index',
  }),
  INDEXING_COMPLETE: i18n.translate('xpack.fileUpload.jsonUploadAndParse.indexingComplete', {
    defaultMessage: 'Indexing complete',
  }),
  CREATING_INDEX_PATTERN: i18n.translate(
    'xpack.fileUpload.jsonUploadAndParse.creatingIndexPattern',
    { defaultMessage: 'Creating index pattern' }
  ),
  INDEX_PATTERN_COMPLETE: i18n.translate(
    'xpack.fileUpload.jsonUploadAndParse.indexPatternComplete',
    { defaultMessage: 'Index pattern complete' }
  ),
  INDEXING_ERROR: i18n.translate('xpack.fileUpload.jsonUploadAndParse.dataIndexingError', {
    defaultMessage: 'Data indexing error',
  }),
  INDEX_PATTERN_ERROR: i18n.translate('xpack.fileUpload.jsonUploadAndParse.indexPatternError', {
    defaultMessage: 'Index pattern error',
  }),
};

export class JsonUploadAndParse extends Component {
  state = {
    // File state
    fileRef: null,
    parsedFile: null,
    indexedFile: null,

    // Index state
    indexTypes: [],
    selectedIndexType: '',
    indexName: '',
    indexRequestInFlight: false,
    indexPatternRequestInFlight: false,
    hasIndexErrors: false,
    isIndexReady: false,

    // Progress-tracking state
    showImportProgress: false,
    currentIndexingStage: INDEXING_STAGE.INDEXING_STARTED,
    indexDataResp: '',
    indexPatternResp: '',
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _resetFileAndIndexSettings = () => {
    if (this.props.onFileRemove && this.state.fileRef) {
      this.props.onFileRemove(this.state.fileRef);
    }
    this.setState({
      indexTypes: [],
      selectedIndexType: '',
      indexName: '',
      indexedFile: null,
      parsedFile: null,
      fileRef: null,
    });
  };

  componentDidUpdate(prevProps, prevState) {
    if (!_.isEqual(prevState.parsedFile, this.state.parsedFile)) {
      this._setIndexTypes({ ...this.state, ...this.props });
    }
    this._setSelectedType(this.state);
    this._setIndexReady({ ...this.state, ...this.props });
    this._indexData({ ...this.state, ...this.props });
    if (this.props.isIndexingTriggered && !this.state.showImportProgress && this._isMounted) {
      this.setState({ showImportProgress: true });
    }
  }

  _setSelectedType = ({ selectedIndexType, indexTypes }) => {
    if (!selectedIndexType && indexTypes.length) {
      this.setState({ selectedIndexType: indexTypes[0] });
    }
  };

  _setIndexReady = ({
    parsedFile,
    selectedIndexType,
    indexName,
    hasIndexErrors,
    indexRequestInFlight,
    onIndexReady,
  }) => {
    const isIndexReady =
      !!parsedFile &&
      !!selectedIndexType &&
      !!indexName &&
      !hasIndexErrors &&
      !indexRequestInFlight;
    if (isIndexReady !== this.state.isIndexReady) {
      this.setState({ isIndexReady });
      if (onIndexReady) {
        onIndexReady(isIndexReady);
      }
    }
  };

  _indexData = async ({
    indexedFile,
    parsedFile,
    indexRequestInFlight,
    transformDetails,
    indexName,
    appName,
    selectedIndexType,
    isIndexingTriggered,
    isIndexReady,
    onIndexingComplete,
    boolCreateIndexPattern,
  }) => {
    // Check index ready
    const filesAreEqual = _.isEqual(indexedFile, parsedFile);
    if (!isIndexingTriggered || filesAreEqual || !isIndexReady || indexRequestInFlight) {
      return;
    }
    this.setState({
      indexRequestInFlight: true,
      currentIndexingStage: INDEXING_STAGE.WRITING_TO_INDEX,
    });

    // Index data
    const indexDataResp = await indexData(
      parsedFile,
      transformDetails,
      indexName,
      selectedIndexType,
      appName
    );

    if (!this._isMounted) {
      return;
    }

    // Index error
    if (!indexDataResp.success) {
      this.setState({
        indexedFile: null,
        indexDataResp,
        indexRequestInFlight: false,
        currentIndexingStage: INDEXING_STAGE.INDEXING_ERROR,
      });
      this._resetFileAndIndexSettings();
      if (onIndexingComplete) {
        onIndexingComplete({ indexDataResp });
      }
      return;
    }

    // Index data success. Update state & create index pattern
    this.setState({
      indexDataResp,
      indexedFile: parsedFile,
      currentIndexingStage: INDEXING_STAGE.INDEXING_COMPLETE,
    });
    let indexPatternResp;
    if (boolCreateIndexPattern) {
      indexPatternResp = await this._createIndexPattern(this.state);
    }

    // Indexing complete, update state & callback (if any)
    if (!this._isMounted || !indexPatternResp) {
      return;
    }
    this.setState({
      currentIndexingStage: INDEXING_STAGE.INDEX_PATTERN_COMPLETE,
    });
    if (onIndexingComplete) {
      onIndexingComplete({
        indexDataResp,
        ...(boolCreateIndexPattern ? { indexPatternResp } : {}),
      });
    }
  };

  _createIndexPattern = async ({ indexName }) => {
    if (!this._isMounted) {
      return;
    }
    this.setState({
      indexPatternRequestInFlight: true,
      currentIndexingStage: INDEXING_STAGE.CREATING_INDEX_PATTERN,
    });
    const indexPatternResp = await createIndexPattern(indexName);

    if (!this._isMounted) {
      return;
    }
    this.setState({
      indexPatternResp,
      indexPatternRequestInFlight: false,
    });
    this._resetFileAndIndexSettings();

    return indexPatternResp;
  };

  // This is mostly for geo. Some data have multiple valid index types that can
  // be chosen from, such as 'geo_point' vs. 'geo_shape' for point data
  _setIndexTypes = ({ transformDetails, parsedFile }) => {
    if (parsedFile) {
      // User-provided index types
      if (typeof transformDetails === 'object') {
        this.setState({ indexTypes: transformDetails.indexTypes });
      } else {
        // Included index types
        switch (transformDetails) {
          case 'geo':
            const featureTypes = _.uniq(
              parsedFile.features
                ? parsedFile.features.map(({ geometry }) => geometry.type)
                : [parsedFile.geometry.type]
            );
            this.setState({
              indexTypes: getGeoIndexTypesForFeatures(featureTypes),
            });
            break;
          default:
            this.setState({ indexTypes: [] });
            return;
        }
      }
    }
  };

  render() {
    const {
      currentIndexingStage,
      indexDataResp,
      indexPatternResp,
      fileRef,
      indexName,
      indexTypes,
      showImportProgress,
    } = this.state;
    const { onFileUpload, transformDetails } = this.props;

    return (
      <EuiForm>
        {showImportProgress ? (
          <JsonImportProgress
            importStage={currentIndexingStage}
            indexDataResp={indexDataResp}
            indexPatternResp={indexPatternResp}
            complete={
              currentIndexingStage === INDEXING_STAGE.INDEX_PATTERN_COMPLETE ||
              currentIndexingStage === INDEXING_STAGE.INDEXING_ERROR
            }
            indexName={indexName}
          />
        ) : (
          <Fragment>
            <JsonIndexFilePicker
              {...{
                onFileUpload,
                fileRef,
                setIndexName: indexName => this.setState({ indexName }),
                setFileRef: fileRef => this.setState({ fileRef }),
                setParsedFile: parsedFile => this.setState({ parsedFile }),
                transformDetails,
                resetFileAndIndexSettings: this._resetFileAndIndexSettings,
              }}
            />
            <IndexSettings
              disabled={!fileRef}
              indexName={indexName}
              setIndexName={indexName => this.setState({ indexName })}
              indexTypes={indexTypes}
              setSelectedIndexType={selectedIndexType => this.setState({ selectedIndexType })}
              setHasIndexErrors={hasIndexErrors => this.setState({ hasIndexErrors })}
            />
          </Fragment>
        )}
      </EuiForm>
    );
  }
}

JsonUploadAndParse.defaultProps = {
  isIndexingTriggered: false,
  boolCreateIndexPattern: true,
};

JsonUploadAndParse.propTypes = {
  appName: PropTypes.string,
  isIndexingTriggered: PropTypes.bool,
  boolCreateIndexPattern: PropTypes.bool,
  transformDetails: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onIndexReadyStatusChange: PropTypes.func,
  onIndexingComplete: PropTypes.func,
  onFileUpload: PropTypes.func,
  onFileRemove: PropTypes.func,
};
