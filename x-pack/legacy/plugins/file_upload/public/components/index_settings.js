/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText, EuiSelect, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getExistingIndices, getExistingIndexPatterns }
  from '../util/indexing_service';

export class IndexSettings extends Component {

  state = {
    indexNameError: '',
    indexDisabled: true,
    indexPatterns: null,
    indexNames: null,
    indexName: '',
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

  async _getIndexNames() {
    if (this.state.indexNames) {
      return this.state.indexNames;
    }
    const indices = await getExistingIndices();
    const indexNames = indices
      ? indices.map(({ name }) => name)
      : [];
    this.setState({ indexNames });
    return indexNames;
  }

  async _getIndexPatterns() {
    if (this.state.indexPatterns) {
      return this.state.indexPatterns;
    }
    const patterns = await getExistingIndexPatterns();
    const indexPatterns = patterns
      ? patterns.map(({ name }) => name)
      : [];
    this.setState({ indexPatterns });
    return indexPatterns;
  }

  _setIndexName = async name => {
    const errorMessage = await this._isIndexNameAndPatternValid(name);
    return this.setState({
      indexName: name,
      indexNameError: errorMessage
    });
  }

  _onIndexChange = async ({ target }) => {
    const name = target.value;
    await this._setIndexName(name);
    this.props.setIndexName(name);
  }

  _isIndexNameAndPatternValid = async name => {
    const indexNames = await this._getIndexNames();
    const indexPatterns = await this._getIndexPatterns();
    if (indexNames.find(i => i === name) || indexPatterns.find(i => i === name)) {
      return (
        <FormattedMessage
          id="xpack.fileUpload.indexSettings.indexNameAlreadyExistsErrorMessage"
          defaultMessage="Index name or pattern already exists."
        />
      );
    }

    const reg = new RegExp('[\\\\/\*\?\"\<\>\|\\s\,\#]+');
    if (
      (name !== name.toLowerCase()) || // name should be lowercase
      (name === '.' || name === '..')   || // name can't be . or ..
      name.match(/^[-_+]/) !== null  || // name can't start with these chars
      name.match(reg) !== null // name can't contain these chars
    ) {
      return (
        <FormattedMessage
          id="xpack.fileUpload.indexSettings.indexNameContainsIllegalCharactersErrorMessage"
          defaultMessage="Index name contains illegal characters."
        />
      );
    }
    return '';
  }

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
        )}
      </Fragment>
    );
  }
}
