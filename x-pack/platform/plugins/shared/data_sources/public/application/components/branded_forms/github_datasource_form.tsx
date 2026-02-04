/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';

const GitHubDataSourceForm: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  const { emptyField } = fieldValidators;

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <UseField
            path="config.serverUrl"
            component={TextField}
            config={{
              label: i18n.translate('xpack.dataSources.githubForm.serverUrlLabel', {
                defaultMessage: 'Server URL',
              }),
              helpText: i18n.translate('xpack.dataSources.githubForm.serverUrlHelpText', {
                defaultMessage: 'GitHub MCP server endpoint',
              }),
              validations: [
                {
                  validator: emptyField(
                    i18n.translate('xpack.dataSources.githubForm.serverUrlRequired', {
                      defaultMessage: 'Server URL is required',
                    })
                  ),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: {
                readOnly: false,
                'data-test-subj': 'github-datasource-server-url-input',
              },
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.dataSources.githubForm.description', {
                defaultMessage:
                  'Connect to GitHub using a personal access token with appropriate permissions.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />

          <UseField
            path="secrets.token"
            component={TextField}
            config={{
              label: i18n.translate('xpack.dataSources.githubForm.tokenLabel', {
                defaultMessage: 'Personal Access Token',
              }),
              helpText: i18n.translate('xpack.dataSources.githubForm.tokenHelpText', {
                defaultMessage:
                  'GitHub Personal Access Token, OAuth token, or GitHub Copilot token. ' +
                  'Do not include "Bearer" prefix - it will be added automatically.' +
                  (isEdit ? ' You must re-enter the token each time you edit this connector.' : ''),
              }),
              validations: [
                {
                  validator: emptyField(
                    i18n.translate('xpack.dataSources.githubForm.tokenRequired', {
                      defaultMessage: 'Token is required',
                    })
                  ),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: {
                type: 'password',
                readOnly,
                'data-test-subj': 'github-datasource-token-input',
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { GitHubDataSourceForm as default };
