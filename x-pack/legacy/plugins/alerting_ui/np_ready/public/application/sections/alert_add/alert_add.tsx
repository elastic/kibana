/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useContext, useState, useCallback, useReducer, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiForm,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFieldText,
} from '@elastic/eui';
import { useAppDependencies } from '../..';
import { saveAlert } from '../../lib/api';
import { AlertsContext } from '../../context/alerts_context';
import { alertReducer } from './alert_reducer';

interface Props {
  refreshList: () => Promise<void>;
}

export const AlertAdd = ({ refreshList }: Props) => {
  const {
    core: { http },
    plugins: { toastNotifications },
  } = useAppDependencies();
  const { alertFlyoutVisible, setAlertFlyoutVisibility } = useContext(AlertsContext);
  // hooks
  const [{ alert }, dispatch] = useReducer(alertReducer, {
    action: {},
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const closeFlyout = useCallback(() => setAlertFlyoutVisibility(false), []);

  if (!alertFlyoutVisible) {
    return null;
  }

  async function onSaveAlert(): Promise<any> {
    try {
      const newAlert = await saveAlert({ http, alert });
      toastNotifications.addSuccess(
        i18n.translate('xpack.alertingUI.sections.alertAdd.saveSuccessNotificationText', {
          defaultMessage: "Saved '{alertName}'",
          values: {
            alertName: newAlert.id,
          },
        })
      );
      return newAlert;
    } catch (error) {
      return {
        error,
      };
    }
  }

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutAlertAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3 id="flyoutTitle">
            <FormattedMessage
              defaultMessage={'Create Alert'}
              id="xpack.alertingUI.sections.alertAdd.flyoutTitle"
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm></EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => setAlertFlyoutVisibility(false)}>
              {i18n.translate('xpack.alertingUI.sections.alertAdd.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="secondary"
              data-test-subj="saveActionButton"
              type="submit"
              iconType="check"
              isLoading={isSaving}
              onClick={async () => {
                setIsSaving(true);
                const savedAlert = await onSaveAlert();
                setIsSaving(false);
                setAlertFlyoutVisibility(false);
                refreshList();
              }}
            >
              <FormattedMessage
                id="xpack.alertingUI.sections.alertAdd.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
