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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { connect } from 'react-redux';
import { isEqual } from 'lodash';
import { AppState } from '../state';
import { selectDynamicSettings } from '../state/selectors';
import { DynamicSettingsState } from '../state/reducers/dynamic_settings';
import { getDynamicSettings, setDynamicSettings } from '../state/actions/dynamic_settings';
import { DynamicSettings } from '../../common/runtime_types';

interface Props {
  dynamicSettingsState: DynamicSettingsState;
}

interface DispatchProps {
  loadDynamicSettings: typeof getDynamicSettings;
  saveDynamicSettings: typeof setDynamicSettings;
}

const fieldValidators: { [key: string]: (v: any) => string | null } = {
  heartbeatIndices: v => (v && v.match(/^\S+$/) ? null : 'May not be blank'),
};

export const SettingsPageComponent = ({
  dynamicSettingsState: dss,
  loadDynamicSettings,
  saveDynamicSettings,
}: Props & DispatchProps) => {
  useEffect(() => {
    loadDynamicSettings({});
  }, [loadDynamicSettings]);

  const [formFields, setFormFields] = useState<{ [key: string]: any }>(dss.settings || {});
  if (dss.settings && Object.entries(formFields).length === 0) {
    setFormFields({ ...dss.settings });
  }

  let isFormValid: boolean = true;
  const fieldErrors: { [key: string]: string } = {};
  // don't validate if no data loaded
  if (Object.entries(formFields).length > 0) {
    for (const field in fieldValidators) {
      if (fieldValidators.hasOwnProperty(field)) {
        const validator = fieldValidators[field];
        const error = validator(formFields[field]);
        if (error) {
          isFormValid = false;
          fieldErrors[field] = error;
        }
      }
    }
  }

  const onChangeFormField = (field: string, value: any) => {
    formFields[field] = value;
    setFormFields({ ...formFields });
  };

  const onApply = () => {
    // @ts-ignore figure out this cast later
    saveDynamicSettings(formFields);
  };

  const resetForm = () => {
    setFormFields({ ...dss.settings });
  };

  const isFormDirty = dss.settings ? !isEqual(dss.settings, formFields) : true;

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
          title={
            <h4>
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.heartbeatIndicesTitle"
                defaultMessage="Uptime indices"
              />
            </h4>
          }
          description={
            <FormattedMessage
              id="xpack.uptime.sourceConfiguration.heartbeatIndicesDescription"
              defaultMessage="Index pattern for matching indices that contain Heartbeat data"
            />
          }
        >
          <EuiFormRow
            describedByIds={['heartbeatIndices']}
            error={fieldErrors.heartbeatIndices}
            fullWidth
            helpText={
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.heartbeatIndicesRecommendedValue"
                defaultMessage="The recommended value is {defaultValue}"
                values={{
                  // TODO: make this a constant somewhere shared
                  defaultValue: <EuiCode>heartbeat-8*</EuiCode>,
                }}
              />
            }
            // TODO handle what's invalid
            isInvalid={!!fieldErrors.heartbeatIndices}
            label={
              <FormattedMessage
                id="xpack.uptime.sourceConfiguration.heartbeatIndicesLabel"
                defaultMessage="Heartbeat indices"
              />
            }
          >
            <EuiFieldText
              data-test-subj="heartbeatIndicesInput"
              fullWidth
              disabled={dss.loading}
              isLoading={dss.loading}
              value={formFields.heartbeatIndices || ''}
              onChange={(event: any) =>
                onChangeFormField('heartbeatIndices', event.currentTarget.value)
              }
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
            isDisabled={!isFormDirty || dss.loading}
            onClick={() => {
              resetForm();
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
            isDisabled={!isFormDirty || !isFormValid || dss.loading}
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
  saveDynamicSettings: (settings: DynamicSettings): DispatchProps => {
    return dispatch(setDynamicSettings(settings));
  },
});

export const SettingsPage = connect(mapStateToProps, mapDispatchToProps)(SettingsPageComponent);
