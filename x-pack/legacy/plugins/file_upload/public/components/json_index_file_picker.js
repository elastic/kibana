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

const ACCEPTABLE_FILETYPES = [
  'json',
  'geojson',
];

export class JsonIndexFilePicker extends Component {

  state = {
    fileUploadError: '',
    fileParsingProgress: '',
  };

  async componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _fileHandler = async fileList => {
    const fileListArr = Array.from(fileList);
    await this._validateAndParse(fileListArr);
  };

  _validateAndParse = async fileArr => {
    if (!this._isMounted) {
      return;
    }
    this.props.resetFileAndIndexSettings();
    this.setState({ fileUploadError: '' });
    if (fileArr.length === 0) { // Remove
      return;
    }
    if (fileArr.length === 1) { // Parse & index file
      const file = fileArr[0];
      if (!this._validateFile(file)) {
        return;
      }
      await this._parseFile(file);
    }
  };

  _validateFile(file) {
    const { resetFileAndIndexSettings, setIndexName } = this.props;
    if (!file.name) {
      this.setState({
        fileUploadError: i18n.translate(
          'xpack.fileUpload.jsonIndexFilePicker.noFileNameError',
          { defaultMessage: 'No file name provided' })
      });
      return false;
    }

    // Check file type, assign default index name
    const splitNameArr = file.name.split('.');
    const fileType = splitNameArr.pop();
    const types = ACCEPTABLE_FILETYPES.join(', ');
    if (!ACCEPTABLE_FILETYPES.includes(fileType)) {
      this.setState({
        fileUploadError: (
          <FormattedMessage
            id="xpack.fileUpload.jsonIndexFilePicker.acceptableTypesError"
            defaultMessage="File is not one of acceptable types: {types}"
            values={{ types }}
          />
        )
      });
      resetFileAndIndexSettings();
      return false;
    }
    const initIndexName = splitNameArr[0];
    setIndexName(initIndexName);

    // Check valid size
    const { size } = file;
    if (size > MAX_FILE_SIZE) {
      this.setState({
        fileUploadError: (
          <FormattedMessage
            id="xpack.fileUpload.jsonIndexFilePicker.acceptableFileSize"
            defaultMessage="File size {fileSize} bytes exceeds max file size of {maxFileSize}"
            values={{
              fileSize: size,
              maxFileSize: MAX_FILE_SIZE
            }}
          />
        )
      });
      return false;
    }
    return true;
  }

  async _parseFile(file) {
    const {
      setFileRef, setParsedFile, resetFileAndIndexSettings, onFileUpload, transformDetails
    } = this.props;
    // Parse file
    this.setState({ fileParsingProgress: i18n.translate(
      'xpack.fileUpload.jsonIndexFilePicker.parsingFile',
      { defaultMessage: 'Parsing file...' })
    });
    const parsedFileResult = await parseFile(
      file, transformDetails, onFileUpload
    ).catch(err => {
      if (this._isMounted) {
        this.setState({
          fileUploadError: (
            <FormattedMessage
              id="xpack.fileUpload.jsonIndexFilePicker.unableParseFile"
              defaultMessage="Unable to parse file: {error}"
              values={{
                error: err.message
              }}
            />
          )
        });
      }
    });
    if (!this._isMounted) {
      return;
    }
    this.setState({ fileParsingProgress: '' });
    if (!parsedFileResult) {
      resetFileAndIndexSettings();
      return;
    }
    setFileRef(file);
    setParsedFile(parsedFileResult);
  }

  render() {
    const { fileParsingProgress, fileUploadError } = this.state;

    return (
      <Fragment>
        {fileParsingProgress ? <EuiProgress size="xs" color="accent" position="absolute" /> : null}

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
            fileParsingProgress ? (
              fileParsingProgress
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
  return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`;
}
