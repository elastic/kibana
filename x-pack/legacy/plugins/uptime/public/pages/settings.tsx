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
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch, useSelector } from 'react-redux';
import { cloneDeep, isEqual, set } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Link } from 'react-router-dom';
import { selectDynamicSettings } from '../state/selectors';
import { getDynamicSettings, setDynamicSettings } from '../state/actions/dynamic_settings';
import { DynamicSettings } from '../../common/runtime_types';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { OVERVIEW_ROUTE } from '../../common/constants';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { UptimePage, useUptimeTelemetry } from '../hooks';
import { IndicesForm } from '../components/settings/indices_form';
import {
  CertificateExpirationForm,
  OnFieldChangeType,
} from '../components/settings/certificate_form';

const getFieldErrors = (formFields: DynamicSettings | null) => {
  if (formFields) {
    const blankStr = 'May not be blank';
    const { certificatesThresholds, heartbeatIndices } = formFields;
    const heartbeatIndErr = heartbeatIndices.match(/^\S+$/) ? '' : blankStr;
    const errorStateErr = certificatesThresholds?.errorState ? null : blankStr;
    const warningStateErr = certificatesThresholds?.warningState ? null : blankStr;
    return {
      heartbeatIndices: heartbeatIndErr,
      certificatesThresholds:
        errorStateErr || warningStateErr
          ? {
              errorState: errorStateErr,
              warningState: warningStateErr,
            }
          : null,
    };
  }
  return null;
};

export const SettingsPage = () => {
  const dss = useSelector(selectDynamicSettings);

  const settingsBreadcrumbText = i18n.translate('xpack.uptime.settingsBreadcrumbText', {
    defaultMessage: 'Settings',
  });
  useBreadcrumbs([{ text: settingsBreadcrumbText }]);

  useUptimeTelemetry(UptimePage.Settings);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getDynamicSettings());
  }, [dispatch]);

  const [formFields, setFormFields] = useState<DynamicSettings | null>(dss.settings || null);

  if (!dss.loadError && formFields == null && dss.settings) {
    setFormFields({ ...dss.settings });
  }

  const fieldErrors = getFieldErrors(formFields);

  const isFormValid = !(fieldErrors && Object.values(fieldErrors).find(v => !!v));

  const onChangeFormField: OnFieldChangeType = (field, value) => {
    if (formFields) {
      const newFormFields = cloneDeep(formFields);
      set(newFormFields, field, value);
      setFormFields(cloneDeep(newFormFields));
    }
  };

  const onApply = (event: React.FormEvent) => {
    event.preventDefault();
    if (formFields) {
      dispatch(setDynamicSettings(formFields));
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
      <Link to={OVERVIEW_ROUTE} data-test-subj="uptimeSettingsToOverviewLink">
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
                <IndicesForm
                  onChange={onChangeFormField}
                  formFields={formFields}
                  fieldErrors={fieldErrors}
                  isDisabled={isFormDisabled}
                />
                <CertificateExpirationForm
                  onChange={onChangeFormField}
                  formFields={formFields}
                  fieldErrors={fieldErrors}
                  isDisabled={isFormDisabled}
                />

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
