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
  EuiToast,
  EuiButtonEmpty,
  EuiPage,
  EuiPageBody,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { connect } from 'react-redux';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Link } from 'react-router-dom';
import { AppState } from '../state';
import { selectDynamicSettings } from '../state/selectors';
import { DynamicSettingsState } from '../state/reducers/dynamic_settings';
import { getDynamicSettings, setDynamicSettings } from '../state/actions/dynamic_settings';
import { DynamicSettings, defaultDynamicSettings } from '../../common/runtime_types';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { OVERVIEW_ROUTE } from '../../common/constants';

interface Props {
  dynamicSettingsState: DynamicSettingsState;
}

interface DispatchProps {
  dispatchGetDynamicSettings: typeof getDynamicSettings;
  dispatchSetDynamicSettings: typeof setDynamicSettings;
}

export const SettingsPageComponent = ({
  dynamicSettingsState: dss,
  dispatchGetDynamicSettings,
  dispatchSetDynamicSettings,
}: Props & DispatchProps) => {
  const settingsBreadcrumbText = i18n.translate('xpack.uptime.settingsBreadcrumbText', {
    defaultMessage: 'Settings',
  });
  useBreadcrumbs([{ text: settingsBreadcrumbText }]);

  useEffect(() => {
    dispatchGetDynamicSettings({});
  }, [dispatchGetDynamicSettings]);

  const [formFields, setFormFields] = useState<DynamicSettings | null>(dss.settings || null);

  if (dss.loadError) {
    // eslint-disable-next-line no-console
    console.error('Could not load settings', dss.loadError);
    return (
      <EuiToast color="danger" iconType="alert" title="Could not load settings">
        {dss.loadError.name} - {dss.loadError.message}
      </EuiToast>
    );
  }

  if (!dss.loadError && formFields == null && dss.settings) {
    setFormFields({ ...dss.settings });
  }

  const fieldErrors = formFields && {
    heartbeatIndices: formFields.heartbeatIndices.match(/^\S+$/) ? null : 'May not be blank',
  };
  const isFormValid = !(fieldErrors && Object.values(fieldErrors).find(v => !!v));

  const onChangeFormField = (field: keyof DynamicSettings, value: any) => {
    if (formFields) {
      formFields[field] = value;
      setFormFields({ ...formFields });
    }
  };

  const onApply = () => {
    if (formFields) {
      dispatchSetDynamicSettings(formFields);
    }
  };

  const resetForm = () => {
    if (formFields && dss.settings) {
      setFormFields({ ...dss.settings });
    }
  };

  const isFormDirty = dss.settings ? !isEqual(dss.settings, formFields) : true;

  return (
    <>
      <Link to={OVERVIEW_ROUTE}>
        <EuiButtonEmpty size="s" color="primary" iconType="arrowLeft">
          {i18n.translate('xpack.uptime.settings.returnToOverviewLinkLabel', {
            defaultMessage: 'Return to overview',
          })}
        </EuiButtonEmpty>
      </Link>
      <EuiPage>
        <EuiPageBody>
          <EuiPanel>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <form onSubmit={onApply}>
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
                        error={fieldErrors?.heartbeatIndices}
                        fullWidth
                        helpText={
                          <FormattedMessage
                            id="xpack.uptime.sourceConfiguration.heartbeatIndicesDefaultValue"
                            defaultMessage="The default value is {defaultValue}"
                            values={{
                              defaultValue: (
                                <EuiCode>{defaultDynamicSettings.heartbeatIndices}</EuiCode>
                              ),
                            }}
                          />
                        }
                        isInvalid={!!fieldErrors?.heartbeatIndices}
                        label={
                          <FormattedMessage
                            id="xpack.uptime.sourceConfiguration.heartbeatIndicesLabel"
                            defaultMessage="Heartbeat indices"
                          />
                        }
                      >
                        <EuiFieldText
                          data-test-subj="heartbeat-indices-input"
                          fullWidth
                          disabled={dss.loading}
                          isLoading={dss.loading}
                          value={formFields?.heartbeatIndices || ''}
                          onChange={(event: any) =>
                            onChangeFormField('heartbeatIndices', event.currentTarget.value)
                          }
                        />
                      </EuiFormRow>
                    </EuiDescribedFormGroup>

                    <EuiSpacer size="m" />
                    <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          data-test-subj="discardSettingsButton"
                          isDisabled={!isFormDirty || dss.loading}
                          onClick={() => {
                            resetForm();
                          }}
                        >
                          <FormattedMessage
                            id="xpack.uptime.sourceConfiguration.discardSettingsButtonLabel"
                            defaultMessage="Cancel"
                          />
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          data-test-subj="apply-settings-button"
                          type="submit"
                          color="primary"
                          isDisabled={!isFormDirty || !isFormValid || dss.loading}
                          fill
                          onClick={onApply}
                        >
                          <FormattedMessage
                            id="xpack.uptime.sourceConfiguration.applySettingsButtonLabel"
                            defaultMessage="Apply changes"
                          />
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiForm>
                </form>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiPageBody>
      </EuiPage>
    </>
  );
};

const mapStateToProps = (state: AppState) => ({
  dynamicSettingsState: selectDynamicSettings(state),
});

const mapDispatchToProps = (dispatch: any) => ({
  dispatchGetDynamicSettings: () => {
    return dispatch(getDynamicSettings({}));
  },
  dispatchSetDynamicSettings: (settings: DynamicSettings) => {
    return dispatch(setDynamicSettings(settings));
  },
});

export const SettingsPage = connect(mapStateToProps, mapDispatchToProps)(SettingsPageComponent);
