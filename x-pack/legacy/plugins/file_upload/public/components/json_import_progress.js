/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCodeBlock, EuiSpacer, EuiText, EuiTitle, EuiProgress, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { basePath } from '../kibana_services';

export class JsonImportProgress extends Component {
  state = {
    indexDataJson: null,
    indexPatternJson: null,
    indexName: '',
    importStage: '',
  };

  componentDidUpdate(prevProps, prevState) {
    this._setIndex(this.props);
    this._formatIndexDataResponse({ ...this.state, ...this.props });
    this._formatIndexPatternResponse({ ...this.state, ...this.props });
    if (prevState.importStage !== this.props.importStage) {
      this.setState({
        importStage: this.props.importStage,
      });
    }
  }

  // Retain last index for UI purposes
  _setIndex = ({ indexName }) => {
    if (indexName && !this.state.indexName) {
      this.setState({ indexName });
    }
  };

  // Format json responses
  _formatIndexDataResponse = ({ indexDataResp, indexDataJson }) => {
    if (indexDataResp && !indexDataJson) {
      this.setState({ indexDataJson: JSON.stringify(indexDataResp, null, 2) });
    }
  };

  _formatIndexPatternResponse = ({ indexPatternResp, indexPatternJson }) => {
    if (indexPatternResp && !indexPatternJson) {
      this.setState({ indexPatternJson: JSON.stringify(indexPatternResp, null, 2) });
    }
  };

  render() {
    const { complete } = this.props;
    const { indexPatternJson, indexDataJson, indexName, importStage } = this.state;
    const importMessage = complete ? importStage : `${importStage}: ${indexName}`;

    return (
      <Fragment>
        {!complete ? <EuiProgress size="xs" color="accent" position="absolute" /> : null}
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.fileUpload.jsonImport.indexingStatus"
              defaultMessage="Indexing status"
            />
          </h3>
        </EuiTitle>
        <EuiText>{importMessage && <p>{importMessage}</p>}</EuiText>
        <EuiSpacer size="m" />
        {complete ? (
          <Fragment>
            {indexDataJson ? (
              <Fragment>
                <EuiTitle size="xxs">
                  <h4>
                    <FormattedMessage
                      id="xpack.fileUpload.jsonImport.indexingResponse"
                      defaultMessage="Indexing response"
                    />
                  </h4>
                </EuiTitle>
                <EuiCodeBlock
                  data-test-subj="indexRespCodeBlock"
                  paddingSize="s"
                  overflowHeight={200}
                >
                  {indexDataJson}
                </EuiCodeBlock>
                <EuiSpacer size="m" />
              </Fragment>
            ) : null}
            {indexPatternJson ? (
              <Fragment>
                <EuiTitle size="xxs">
                  <h4>
                    <FormattedMessage
                      id="xpack.fileUpload.jsonImport.indexPatternResponse"
                      defaultMessage="Index pattern response"
                    />
                  </h4>
                </EuiTitle>
                <EuiCodeBlock
                  data-test-subj="indexPatternRespCodeBlock"
                  paddingSize="s"
                  overflowHeight={200}
                >
                  {indexPatternJson}
                </EuiCodeBlock>
                <EuiSpacer size="m" />
              </Fragment>
            ) : null}
            <EuiCallOut>
              <div>
                {i18n.translate('xpack.fileUpload.jsonImport.indexModsMsg', {
                  defaultMessage: 'Further index modifications can be made using\n',
                })}
                <a
                  data-test-subj="indexManagementNewIndexLink"
                  target="_blank"
                  href={`${basePath}/app/kibana#/
                      management/elasticsearch/index_management/indices/
                      filter/${indexName}`.replace(/\s/g, '')}
                >
                  {i18n.translate('xpack.fileUpload.jsonImport.indexMgmtLink', {
                    defaultMessage: 'Index Management',
                  })}
                </a>
                .
              </div>
            </EuiCallOut>
          </Fragment>
        ) : null}
      </Fragment>
    );
  }
}
