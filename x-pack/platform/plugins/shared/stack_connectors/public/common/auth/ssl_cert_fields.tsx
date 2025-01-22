/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { PasswordField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { FilePickerField } from '@kbn/es-ui-shared-plugin/static/forms/components';

import { SSLCertType } from '../../../common/auth/constants';
import * as i18n from './translations';

const { emptyField } = fieldValidators;

interface BasicAuthProps {
  readOnly: boolean;
  certTypeDefaultValue: SSLCertType;
  certType: SSLCertType;
}

export const SSLCertFields: React.FC<BasicAuthProps> = ({
  readOnly,
  certTypeDefaultValue,
  certType,
}) => (
  <EuiFlexGroup justifyContent="spaceBetween" data-test-subj="sslCertFields">
    <EuiFlexItem>
      <UseField
        path="secrets.password"
        config={{
          label: i18n.PASSWORD,
        }}
        component={PasswordField}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'webhookSSLPassphraseInput',
            readOnly,
          },
        }}
      />
      <EuiSpacer size="s" />
      <UseField
        path="config.certType"
        defaultValue={certTypeDefaultValue}
        component={({ field }) => (
          <EuiTabs size="s" data-test-subj="webhookCertTypeTabs">
            <EuiTab
              onClick={() => field.setValue(SSLCertType.CRT)}
              isSelected={field.value === SSLCertType.CRT}
            >
              {i18n.CERT_TYPE_CRT_KEY}
            </EuiTab>
            <EuiTab
              onClick={() => field.setValue(SSLCertType.PFX)}
              isSelected={field.value === SSLCertType.PFX}
            >
              {i18n.CERT_TYPE_PFX}
            </EuiTab>
          </EuiTabs>
        )}
      />
      <EuiSpacer size="s" />
      {certType === SSLCertType.CRT && (
        <EuiFlexGroup wrap>
          <EuiFlexItem css={{ minWidth: 200 }}>
            <UseField
              path="secrets.crt"
              config={{
                label: 'CRT file',
                validations: [
                  {
                    validator: emptyField(i18n.CRT_REQUIRED),
                  },
                ],
              }}
              component={FilePickerField}
              componentProps={{
                euiFieldProps: {
                  'data-test-subj': 'webhookSSLCRTInput',
                  display: 'default',
                  accept: '.crt,.cert,.cer,.pem',
                },
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem css={{ minWidth: 200 }}>
            <UseField
              path="secrets.key"
              config={{
                label: 'KEY file',
                validations: [
                  {
                    validator: emptyField(i18n.KEY_REQUIRED),
                  },
                ],
              }}
              component={FilePickerField}
              componentProps={{
                euiFieldProps: {
                  'data-test-subj': 'webhookSSLKEYInput',
                  display: 'default',
                  accept: '.key,.pem',
                },
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {certType === SSLCertType.PFX && (
        <UseField
          path="secrets.pfx"
          config={{
            label: 'PFX file',
            validations: [
              {
                validator: emptyField(i18n.PFX_REQUIRED),
              },
            ],
          }}
          component={FilePickerField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'webhookSSLPFXInput',
              display: 'default',
              accept: '.pfx,.p12',
            },
          }}
        />
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);
