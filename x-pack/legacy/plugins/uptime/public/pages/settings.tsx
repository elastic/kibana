/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
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
import { defaultDynamicSettings, DynamicSettings } from '../../common/runtime_types';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { OVERVIEW_ROUTE } from '../../common/constants';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { UptimePage, useUptimeTelemetry } from '../hooks';

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

  useUptimeTelemetry(UptimePage.Settings);

  useEffect(() => {
    dispatchGetDynamicSettings({});
  }, [dispatchGetDynamicSettings]);

  const [formFields, setFormFields] = useState<DynamicSettings | null>(dss.settings || null);

  if (!dss.loadError && formFields == null && dss.settings) {
    setFormFields({ ...dss.settings });
  }

  const fieldErrors = formFields && {
    heartbeatIndices: formFields.heartbeatIndices.match(/^\S+$/) ? null : 'May not be blank',
  };
  const isFormValid = !(fieldErrors && Object.values(fieldErrors).find((v) => !!v));

  const onChangeFormField = (field: keyof DynamicSettings, value: any) => {
    if (formFields) {
      formFields[field] = value;
      setFormFields({ ...formFields });
    }
  };

  const onApply = (event: React.FormEvent) => {
    event.preventDefault();
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
  const canEdit: boolean =
    !!useKibana().services?.application?.capabilities.uptime.configureSettings || false;
  const isFormDisabled = dss.loading || !canEdit;

  const editNoticeTitle = i18n.translate('xpack.uptime.settings.cannotEditTitle', {
    defaultMessage: 'You do not have permission to edit settings.',
  });
  const editNoticeText = i18n.translate('xpack.uptime.settings.cannotEditText', {
    defaultMessage:
      "Your user currently has 'Read' permissions for the Uptime app. Enable a permissions-level of 'All' to edit these settings.",
  });
  const cannotEditNotice = canEdit ? null : (
    <>
      <EuiCallOut title={editNoticeTitle}>{editNoticeText}</EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );

  return (
    <>
      <Link to={OVERVIEW_ROUTE}>
        <EuiButtonEmpty size="s" color="primary" iconType="arrowLeft">
          {i18n.translate('xpack.uptime.settings.returnToOverviewLinkLabel', {
            defaultMessage: 'Return to overview',
          })}
        </EuiButtonEmpty>
      </Link>
      <EuiSpacer size="s" />
      <EuiPanel>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>{cannotEditNotice}</EuiFlexItem>
        </EuiFlexGroup>
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
                      data-test-subj={`heartbeat-indices-input-${
                        dss.loading ? 'loading' : 'loaded'
                      }`}
                      fullWidth
                      disabled={isFormDisabled}
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
                      isDisabled={!isFormDirty || isFormDisabled}
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
                      isDisabled={!isFormDirty || !isFormValid || isFormDisabled}
                      fill
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
