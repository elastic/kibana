/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { CodeEditor } from '@kbn/code-editor';
import type { ImportResults } from '@kbn/file-upload-common';
import { KbnDangerCallout, KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { getDocLinks, getHttp, getUiSettings, getSettings, getTheme } from '../kibana_services';
import { getPartialImportMessage } from './utils';

const services = {
  uiSettings: getUiSettings(),
  settings: getSettings(),
  theme: getTheme(),
};

interface Props {
  failedPermissionCheck: boolean;
  importResults?: ImportResults;
  dataViewResp?: object;
  indexName: string;
}

const STATUS_CALLOUT_DATA_TEST_SUBJ = 'fileUploadStatusCallout';

export class ImportCompleteView extends Component<Props, {}> {
  _renderCodeEditor(json: object | undefined, title: string, copyButtonDataTestSubj: string) {
    if (!json) {
      return null;
    }

    const jsonAsString = JSON.stringify(json, null, 2);

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={jsonAsString}>
              {(copy) => (
                <EuiToolTip
                  content={i18n.translate('xpack.fileUpload.importComplete.copyButtonAriaLabel', {
                    defaultMessage: 'Copy to clipboard',
                  })}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    size="s"
                    onClick={copy}
                    iconType="copy"
                    color="text"
                    data-test-subj={copyButtonDataTestSubj}
                    aria-label={i18n.translate(
                      'xpack.fileUpload.importComplete.copyButtonAriaLabel',
                      {
                        defaultMessage: 'Copy to clipboard',
                      }
                    )}
                  />
                </EuiToolTip>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div style={{ height: '200px' }}>
          <CodeEditor
            languageId="json"
            value={jsonAsString}
            options={{
              readOnly: true,
              lineNumbers: 'off',
              fontSize: 12,
              minimap: {
                enabled: false,
              },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              wrappingIndent: 'indent',
              automaticLayout: true,
            }}
          />
        </div>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  _getStatusMsg() {
    if (this.props.failedPermissionCheck) {
      return (
        <KbnDangerCallout
          announceOnMount={false}
          title={i18n.translate('xpack.fileUpload.importComplete.uploadFailureTitle', {
            defaultMessage: 'Unable to upload file',
          })}
          text={i18n.translate('xpack.fileUpload.importComplete.permissionFailureMsg', {
            defaultMessage:
              'You do not have permission to create or import data into index "{indexName}".',
            values: { indexName: this.props.indexName },
          })}
          actionProps={{
            primary: {
              children: i18n.translate('xpack.fileUpload.importComplete.permission.docLink', {
                defaultMessage: 'View file import permissions',
              }),
              href: getDocLinks().links.maps.importGeospatialPrivileges,
              target: '_blank',
              iconType: 'external',
              iconSide: 'right',
            },
          }}
          data-test-subj={STATUS_CALLOUT_DATA_TEST_SUBJ}
        />
      );
    }

    if (!this.props.importResults || !this.props.importResults.success) {
      let reason: string | undefined;
      if (this.props.importResults?.error?.body?.message) {
        // Display http request error message
        reason = this.props.importResults.error.body.message;
      } else if (this.props.importResults?.error?.error?.reason) {
        // Display elasticsearch request error message
        reason = this.props.importResults.error.error.reason;
      }
      const errorMsg = reason
        ? i18n.translate('xpack.fileUpload.importComplete.uploadFailureMsgErrorBlock', {
            defaultMessage: 'Error: {reason}',
            values: { reason },
          })
        : '';
      return (
        <KbnDangerCallout
          announceOnMount={false}
          title={i18n.translate('xpack.fileUpload.importComplete.uploadFailureTitle', {
            defaultMessage: 'Unable to upload file',
          })}
          text={errorMsg}
          data-test-subj={STATUS_CALLOUT_DATA_TEST_SUBJ}
        />
      );
    }

    if (this.props.importResults.failures?.length) {
      return (
        <KbnWarningCallout
          announceOnMount={false}
          title={i18n.translate('xpack.fileUpload.importComplete.uploadSuccessWithFailuresTitle', {
            defaultMessage: 'File upload complete with failures',
          })}
          text={getPartialImportMessage(
            this.props.importResults.failures!.length,
            this.props.importResults.docCount
          )}
          data-test-subj={STATUS_CALLOUT_DATA_TEST_SUBJ}
        />
      );
    }

    return (
      <KbnInfoCallout
        title={i18n.translate('xpack.fileUpload.importComplete.uploadSuccessTitle', {
          defaultMessage: 'File upload complete',
        })}
        text={i18n.translate('xpack.fileUpload.importComplete.uploadSuccessMsg', {
          defaultMessage: 'Indexed {numFeatures} features.',
          values: {
            numFeatures: this.props.importResults.docCount,
          },
        })}
        data-test-subj={STATUS_CALLOUT_DATA_TEST_SUBJ}
      />
    );
  }

  _renderIndexManagementMsg() {
    return this.props.importResults && this.props.importResults.success ? (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.fileUpload.importComplete.indexModsMsg"
            defaultMessage="To modify the index, go to "
          />
          <a
            data-test-subj="indexManagementNewIndexLink"
            target="_blank"
            href={getHttp().basePath.prepend('/app/management/data/index_management/indices')}
          >
            <FormattedMessage
              id="xpack.fileUpload.importComplete.indexMgmtLink"
              defaultMessage="Index Management."
            />
          </a>
        </p>
      </EuiText>
    ) : null;
  }

  render() {
    return (
      <KibanaContextProvider services={services}>
        {this._getStatusMsg()}

        {this._renderCodeEditor(
          this.props.importResults,
          i18n.translate('xpack.fileUpload.importComplete.indexingResponse', {
            defaultMessage: 'Import response',
          }),
          'indexRespCopyButton'
        )}
        {this._renderCodeEditor(
          this.props.dataViewResp,
          i18n.translate('xpack.fileUpload.importComplete.dataViewResponse', {
            defaultMessage: 'Data view response',
          }),
          'dataViewRespCopyButton'
        )}
        {this._renderIndexManagementMsg()}
      </KibanaContextProvider>
    );
  }
}
