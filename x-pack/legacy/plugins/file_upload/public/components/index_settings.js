/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText, EuiSelect, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  getExistingIndexNames,
  getExistingIndexPatternNames,
  checkIndexPatternValid,
} from '../util/indexing_service';

export class IndexSettings extends Component {
  state = {
    indexNameError: '',
    indexDisabled: true,
    indexName: '',
    indexNameList: [],
    indexPatternList: [],
  };

  async componentDidMount() {
    this._isMounted = true;
    this.loadExistingIndexData();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  loadExistingIndexData = async () => {
    const indexNameList = await getExistingIndexNames();
    const indexPatternList = await getExistingIndexPatternNames();
    if (this._isMounted) {
      this.setState({
        indexNameList,
        indexPatternList,
      });
    }
  };

  componentDidUpdate(prevProps, prevState) {
    const { indexNameError, indexName } = this.state;
    if (prevState.indexNameError !== indexNameError) {
      this.props.setHasIndexErrors(!!indexNameError);
    }
    const { disabled, indexTypes } = this.props;
    const indexDisabled = disabled || !indexTypes || !indexTypes.length;
    if (indexDisabled !== this.state.indexDisabled) {
      this.setState({ indexDisabled });
    }
    if (this.props.indexName !== indexName) {
      this._setIndexName(this.props.indexName);
    }
  }

  _setIndexName = async name => {
    const errorMessage = await this._isIndexNameAndPatternValid(name);
    return this.setState({
      indexName: name,
      indexNameError: errorMessage,
    });
  };

  _onIndexChange = async ({ target }) => {
    const name = target.value;
    await this._setIndexName(name);
    this.props.setIndexName(name);
  };

  _isIndexNameAndPatternValid = async name => {
    const { indexNameList, indexPatternList } = this.state;
    const nameAlreadyInUse = [...indexNameList, ...indexPatternList].includes(name);
    if (nameAlreadyInUse) {
      return (
        <FormattedMessage
          id="xpack.fileUpload.indexSettings.indexNameAlreadyExistsErrorMessage"
          defaultMessage="Index name or pattern already exists."
        />
      );
    }

    const indexPatternValid = checkIndexPatternValid(name);
    if (!indexPatternValid) {
      return (
        <FormattedMessage
          id="xpack.fileUpload.indexSettings.indexNameContainsIllegalCharactersErrorMessage"
          defaultMessage="Index name contains illegal characters."
        />
      );
    }
    return '';
  };

  render() {
    const { setSelectedIndexType, indexTypes } = this.props;
    const { indexNameError, indexDisabled, indexName } = this.state;

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.fileUpload.indexSettings.enterIndexTypeLabel"
              defaultMessage="Index type"
            />
          }
        >
          <EuiSelect
            data-test-subj="fileImportIndexSelect"
            disabled={indexDisabled}
            options={indexTypes.map(indexType => ({
              text: indexType,
              value: indexType,
            }))}
            onChange={({ target }) => setSelectedIndexType(target.value)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.fileUpload.indexSettings.enterIndexNameLabel"
              defaultMessage="Index name"
            />
          }
          isInvalid={indexNameError !== ''}
          error={[indexNameError]}
        >
          <EuiFieldText
            data-test-subj="fileUploadIndexNameInput"
            disabled={indexDisabled}
            placeholder={i18n.translate('xpack.fileUpload.enterIndexName', {
              defaultMessage: 'Enter Index Name',
            })}
            value={indexName}
            onChange={this._onIndexChange}
            isInvalid={indexNameError !== ''}
            aria-label={i18n.translate('xpack.fileUpload.indexNameReqField', {
              defaultMessage: 'Index name, required field',
            })}
          />
        </EuiFormRow>
        {indexDisabled ? null : (
          <Fragment>
            <EuiSpacer size="m" />
            <EuiCallOut
              title={i18n.translate('xpack.fileUpload.indexSettings.indexNameGuidelines', {
                defaultMessage: 'Index name guidelines',
              })}
              size="s"
            >
              <ul style={{ marginBottom: 0 }}>
                <li>
                  {i18n.translate('xpack.fileUpload.indexSettings.guidelines.mustBeNewIndex', {
                    defaultMessage: 'Must be a new index',
                  })}
                </li>
                <li>
                  {i18n.translate('xpack.fileUpload.indexSettings.guidelines.lowercaseOnly', {
                    defaultMessage: 'Lowercase only',
                  })}
                </li>
                <li>
                  {i18n.translate('xpack.fileUpload.indexSettings.guidelines.cannotInclude', {
                    defaultMessage:
                      'Cannot include \\\\, /, *, ?, ", <, >, |, \
                    " " (space character), , (comma), #',
                  })}
                </li>
                <li>
                  {i18n.translate('xpack.fileUpload.indexSettings.guidelines.cannotStartWith', {
                    defaultMessage: 'Cannot start with -, _, +',
                  })}
                </li>
                <li>
                  {i18n.translate('xpack.fileUpload.indexSettings.guidelines.cannotBe', {
                    defaultMessage: 'Cannot be . or ..',
                  })}
                </li>
                <li>
                  {i18n.translate('xpack.fileUpload.indexSettings.guidelines.length', {
                    defaultMessage:
                      'Cannot be longer than 255 bytes (note it is bytes, \
                    so multi-byte characters will count towards the 255 \
                    limit faster)',
                  })}
                </li>
              </ul>
            </EuiCallOut>
          </Fragment>
        )}
      </Fragment>
    );
  }
}
