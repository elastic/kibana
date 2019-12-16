/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import { EuiFilePicker, EuiFormRow, EuiProgress } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { parseFile } from '../util/file_parser';
import { MAX_FILE_SIZE } from '../../common/constants/file_import';
import _ from 'lodash';

const ACCEPTABLE_FILETYPES = ['json', 'geojson'];

export class JsonIndexFilePicker extends Component {
  state = {
    fileUploadError: '',
    percentageProcessed: 0,
    featuresProcessed: 0,
    fileParseActive: false,
    currentFileTracker: null,
  };

  async componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  getFileParseActive = () => this._isMounted && this.state.fileParseActive;

  _fileHandler = fileList => {
    const fileArr = Array.from(fileList);
    this.props.resetFileAndIndexSettings();
    this.setState({
      fileUploadError: '',
      percentageProcessed: 0,
      featuresProcessed: 0,
    });
    if (fileArr.length === 0) {
      // Remove
      this.setState({
        fileParseActive: false,
      });
      return;
    }
    const file = fileArr[0];

    this.setState(
      {
        fileParseActive: true,
        currentFileTracker: Symbol(),
      },
      () => this._parseFile(file)
    );
  };

  _checkFileSize = ({ size }) => {
    const fileSizeValid = true;
    try {
      if (size > MAX_FILE_SIZE) {
        const humanReadableSize = bytesToSize(size);
        const humanReadableMaxSize = bytesToSize(MAX_FILE_SIZE);
        throw new Error(
          i18n.translate('xpack.fileUpload.jsonIndexFilePicker.acceptableFileSize', {
            defaultMessage: 'File size {fileSize} exceeds max file size of {maxFileSize}',
            values: {
              fileSize: humanReadableSize,
              maxFileSize: humanReadableMaxSize,
            },
          })
        );
      }
    } catch (error) {
      this.setState({
        fileUploadError: i18n.translate('xpack.fileUpload.jsonIndexFilePicker.fileSizeError', {
          defaultMessage: 'File size error: {errorMessage}',
          values: {
            errorMessage: error.message,
          },
        }),
      });
      return;
    }
    return fileSizeValid;
  };

  _getFileNameAndCheckType({ name }) {
    let fileNameOnly;
    try {
      if (!name) {
        throw new Error(
          i18n.translate('xpack.fileUpload.jsonIndexFilePicker.noFileNameError', {
            defaultMessage: 'No file name provided',
          })
        );
      }

      const splitNameArr = name.split('.');
      const fileType = splitNameArr.pop();
      if (!ACCEPTABLE_FILETYPES.includes(fileType)) {
        throw new Error(
          i18n.translate('xpack.fileUpload.jsonIndexFilePicker.acceptableTypesError', {
            defaultMessage: 'File is not one of acceptable types: {types}',
            values: {
              types: ACCEPTABLE_FILETYPES.join(', '),
            },
          })
        );
      }

      fileNameOnly = splitNameArr[0];
    } catch (error) {
      this.setState({
        fileUploadError: i18n.translate(
          'xpack.fileUpload.jsonIndexFilePicker.fileProcessingError',
          {
            defaultMessage: 'File processing error: {errorMessage}',
            values: {
              errorMessage: error.message,
            },
          }
        ),
      });
      return;
    }
    return fileNameOnly.toLowerCase();
  }

  // It's necessary to throttle progress. Updates that are too frequent cause
  // issues (update failure) in the nested progress component
  setFileProgress = _.debounce(({ featuresProcessed, bytesProcessed, totalBytes }) => {
    const percentageProcessed = parseInt((100 * bytesProcessed) / totalBytes);
    if (this.getFileParseActive()) {
      this.setState({ featuresProcessed, percentageProcessed });
    }
  }, 150);

  async _parseFile(file) {
    const { currentFileTracker } = this.state;
    const {
      setFileRef,
      setParsedFile,
      resetFileAndIndexSettings,
      onFileUpload,
      transformDetails,
      setIndexName,
    } = this.props;

    const fileSizeValid = this._checkFileSize(file);
    const defaultIndexName = this._getFileNameAndCheckType(file);
    if (!fileSizeValid || !defaultIndexName) {
      resetFileAndIndexSettings();
      return;
    }
    // Parse file

    const fileResult = await parseFile({
      file,
      transformDetails,
      onFileUpload,
      setFileProgress: this.setFileProgress,
      getFileParseActive: this.getFileParseActive,
    }).catch(err => {
      if (this._isMounted) {
        this.setState({
          fileParseActive: false,
          percentageProcessed: 0,
          featuresProcessed: 0,
          fileUploadError: (
            <FormattedMessage
              id="xpack.fileUpload.jsonIndexFilePicker.unableParseFile"
              defaultMessage="Unable to parse file: {error}"
              values={{
                error: err.message,
              }}
            />
          ),
        });
      }
    });
    if (!this._isMounted) {
      return;
    }

    // If another file is replacing this one, leave file parse active
    this.setState({
      percentageProcessed: 0,
      featuresProcessed: 0,
      fileParseActive: currentFileTracker !== this.state.currentFileTracker,
    });
    if (!fileResult) {
      resetFileAndIndexSettings();
      return;
    }
    const { errors, parsedGeojson } = fileResult;

    if (errors.length) {
      // Set only the first error for now (since there's only one).
      // TODO: Add handling in case of further errors
      const error = errors[0];
      this.setState({
        fileUploadError: (
          <FormattedMessage
            id="xpack.fileUpload.jsonIndexFilePicker.fileParseError"
            defaultMessage="File parse error(s) detected: {error}"
            values={{ error }}
          />
        ),
      });
    }
    setIndexName(defaultIndexName);
    setFileRef(file);
    setParsedFile(parsedGeojson);
  }

  render() {
    const { fileUploadError, percentageProcessed, featuresProcessed } = this.state;

    return (
      <Fragment>
        {percentageProcessed ? (
          <EuiProgress
            value={percentageProcessed}
            max={100}
            size="xs"
            color="accent"
            position="absolute"
          />
        ) : null}
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.fileUpload.jsonIndexFilePicker.filePickerLabel"
              defaultMessage="Select a file to upload"
            />
          }
          isInvalid={fileUploadError !== ''}
          error={[fileUploadError]}
          helpText={
            percentageProcessed ? (
              i18n.translate('xpack.fileUpload.jsonIndexFilePicker.parsingFile', {
                defaultMessage: '{featuresProcessed} features parsed...',
                values: {
                  featuresProcessed,
                },
              })
            ) : (
              <span>
                {i18n.translate('xpack.fileUpload.jsonIndexFilePicker.formatsAccepted', {
                  defaultMessage: 'Formats accepted: .json, .geojson',
                })}{' '}
                <br />
                <FormattedMessage
                  id="xpack.fileUpload.jsonIndexFilePicker.maxSize"
                  defaultMessage="Max size: {maxFileSize}"
                  values={{
                    maxFileSize: bytesToSize(MAX_FILE_SIZE),
                  }}
                />
              </span>
            )
          }
        >
          <EuiFilePicker
            initialPromptText={
              <FormattedMessage
                id="xpack.fileUpload.jsonIndexFilePicker.filePicker"
                defaultMessage="Upload file"
              />
            }
            onChange={this._fileHandler}
          />
        </EuiFormRow>
      </Fragment>
    );
  }
}

function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return 'n/a';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  if (i === 0) return `${bytes} ${sizes[i]})`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}
