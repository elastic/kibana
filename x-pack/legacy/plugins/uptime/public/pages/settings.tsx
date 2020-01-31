/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import {
  EuiForm,
  EuiTitle,
  EuiSpacer,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiCode,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { connect } from 'react-redux';
import { AppState, store } from '../state';
import { selectDynamicSettings } from '../state/selectors';
import { DynamicSettingsState } from '../state/reducers/dynamic_settings';
import { getDynamicSettings } from '../state/actions/dynamic_settings';

interface Props {
  dynamicSettingsState: DynamicSettingsState;
}

export const SettingsPageComponent = ({ dynamicSettingsState: dss }: Props) => {
  return (
    <>
      <EuiPanel>
        <EuiForm>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.indicesSectionTitle"
                defaultMessage="Indices"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiDescribedFormGroup
            idAria="uptimeIndices"
            title={
              <h4>
                <FormattedMessage
                  id="xpack.uptime.sourceConfiguration.uptimeIndicesTitle"
                  defaultMessage="Uptime indices"
                />
              </h4>
            }
            description={
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.uptimeIndicesDescription"
                defaultMessage="Index pattern for matching indices that contain Heartbeat data"
              />
            }
          >
            <EuiFormRow
              describedByIds={['uptimeIndices']}
              // TODO handle errors in input data
              // error={metricAliasFieldProps.error}
              fullWidth
              helpText={
                <FormattedMessage
                  id="xpack.uptime.sourceConfiguration.uptimeIndicesRecommendedValue"
                  defaultMessage="The recommended value is {defaultValue}"
                  values={{
                    // TODO: make this a constant somewhere shared
                    defaultValue: <EuiCode>heartbeat-8*</EuiCode>,
                  }}
                />
              }
              // TODO handle what's invalid
              // isInvalid={metricAliasFieldProps.isInvalid}
              label={
                <FormattedMessage
                  id="xpack.uptime.sourceConfiguration.uptimeIndicesLabel"
                  defaultMessage="Uptime indices"
                />
              }
            >
              <EuiFieldText
                data-test-subj="uptimeIndicesInput"
                fullWidth
                disabled={dss.loading}
                isLoading={dss.loading}
                // readOnly={readOnly}
                // {...uptimeAliasFieldProps}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiForm>
      </EuiPanel>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="discardSettingsButton"
            color="danger"
            iconType="cross"
            isDisabled={dss.loading}
            onClick={() => {
              // resetForm();
            }}
          >
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.discardSettingsButtonLabel"
              defaultMessage="Discard"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="applySettingsButton"
            color="primary"
            // isDisabled={!isFormDirty || !isFormValid}
            fill
            // onClick={persistUpdates}
          >
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.applySettingsButtonLabel"
              defaultMessage="Apply"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const mapStateToProps = (state: AppState) => ({
  dynamicSettingsState: selectDynamicSettings(state),
});

export const SettingsPage = connect(mapStateToProps, null)(SettingsPageComponent);
