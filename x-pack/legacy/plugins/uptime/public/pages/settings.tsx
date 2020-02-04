/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
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
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { connect } from 'react-redux';
import { AppState } from '../state';
import { selectDynamicSettings } from '../state/selectors';
import { DynamicSettingsState } from '../state/reducers/dynamic_settings';
import { getDynamicSettings } from '../state/actions/dynamic_settings';

interface Props {
  dynamicSettingsState: DynamicSettingsState;
}

interface DispatchProps {
  loadDynamicSettings: typeof getDynamicSettings;
}

export const SettingsPageContainer = ({
  dynamicSettingsState: dss,
  loadDynamicSettings,
}: Props & DispatchProps) => {
  useEffect(() => {
    loadDynamicSettings({});
  }, []);

  if (dss.loading) {
    return <EuiText>Loading...</EuiText>;
  }

  return <SettingsPagePresentation dynamicSettingsState={dss} />
};

export const SettingsPagePresentation = ({
  dynamicSettingsState: dss,
}: Props) => {
  const [formFields, setFormFields] = useState<{[key: string]: any}>(dss.settings || {});

  const onChangeFormField = (field: string, value: any) => {
    formFields[field] = value;
    setFormFields(formFields);
  }

  const onApply = () => {
    console.log("SAVE", formFields);
  }

  return (
    <EuiForm>
      <EuiPanel>
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
                defaultValue={dss.settings?.heartbeatIndexName}
                onChange={(event: any) => onChangeFormField('heartbeatIndexName', event.currentTarget.value)}
                // readOnly={readOnly}
                // {...uptimeAliasFieldProps}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
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
            type="submit"
            color="primary"
            // isDisabled={!isFormDirty || !isFormValid}
            fill
            onClick={onApply}
          >
            <FormattedMessage
              id="xpack.infra.sourceConfiguration.applySettingsButtonLabel"
              defaultMessage="Apply"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

const mapStateToProps = (state: AppState) => ({
  dynamicSettingsState: selectDynamicSettings(state),
});

const mapDispatchToProps = (dispatch: any) => ({
  loadDynamicSettings: (): DispatchProps => {
    return dispatch(getDynamicSettings({}));
  },
});

export const SettingsPage = connect(mapStateToProps, mapDispatchToProps)(SettingsPageContainer);
