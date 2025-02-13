/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';

import { EuiSpacer } from '@elastic/eui';
import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { updateActionConnector, useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import type { ConnectorFormSchema } from '@kbn/triggers-actions-ui-plugin/public';
import { snExternalServiceConfig } from '../../../../common/servicenow_config';
import { DeprecatedCallout } from './deprecated_callout';
import { useGetAppInfo } from './use_get_app_info';
import { ApplicationRequiredCallout } from './application_required_callout';
import { isRESTApiError } from './helpers';
import { InstallationCallout } from './installation_callout';
import { UpdateConnector, UpdateConnectorFormSchema } from './update_connector';
import { Credentials } from './credentials';
import * as i18n from './translations';
import { ServiceNowActionConnector, ServiceNowConfig, ServiceNowSecrets } from './types';

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFields as default };

const ServiceNowConnectorFields: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  registerPreSubmitValidator,
  isEdit,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { updateFieldValues } = useFormContext();
  const [{ id, isDeprecated, actionTypeId, name, config, secrets }] = useFormData<
    ConnectorFormSchema<ServiceNowConfig, ServiceNowSecrets>
  >({
    watch: [
      'id',
      'isDeprecated',
      'actionTypeId',
      'name',
      'config.apiUrl',
      'config.isOAuth',
      'secrets.username',
      'secrets.password',
    ],
  });

  const requiresNewApplication = isDeprecated != null ? !isDeprecated : true;
  const { isOAuth = false } = config ?? {};

  const action = useMemo(
    () => ({
      name,
      actionTypeId,
      config,
      secrets,
    }),
    [name, actionTypeId, config, secrets]
  ) as ServiceNowActionConnector;

  const [showUpdateConnector, setShowUpdateConnector] = useState(false);
  const [updateErrorMessage, setUpdateErrorMessage] = useState<string | null>(null);
  const { fetchAppInfo, isLoading } = useGetAppInfo({
    actionTypeId,
    http,
  });

  const getApplicationInfo = useCallback(
    async (connector: ServiceNowActionConnector) => {
      try {
        const res = await fetchAppInfo(connector);
        if (isRESTApiError(res)) {
          throw new Error(res.error?.message ?? i18n.UNKNOWN);
        }

        return res;
      } catch (e) {
        throw e;
      }
    },
    [fetchAppInfo]
  );

  const preSubmitValidator = useCallback(async () => {
    if (requiresNewApplication) {
      try {
        await getApplicationInfo(action);
      } catch (error) {
        return {
          message: (
            <ApplicationRequiredCallout
              appId={actionTypeId != null ? snExternalServiceConfig[actionTypeId]?.appId : ''}
              message={error.message}
            />
          ),
        };
      }
    }
  }, [action, actionTypeId, getApplicationInfo, requiresNewApplication]);

  useEffect(
    () => registerPreSubmitValidator(preSubmitValidator),
    [preSubmitValidator, registerPreSubmitValidator]
  );

  const onMigrateClick = useCallback(() => setShowUpdateConnector(true), []);
  const onModalCancel = useCallback(() => setShowUpdateConnector(false), []);

  const onUpdateConnectorConfirm = useCallback(
    async (updatedConnector: UpdateConnectorFormSchema['updatedConnector']) => {
      const connectorToUpdate = {
        name: name ?? '',
        config: { ...updatedConnector.config, usesTableApi: false },
        secrets: { ...updatedConnector.secrets },
        id: id ?? '',
      };

      try {
        await getApplicationInfo({
          ...connectorToUpdate,
          isDeprecated,
          isPreconfigured: false,
          isSystemAction: false,
          actionTypeId,
        });

        const res = await updateActionConnector({
          http,
          connector: connectorToUpdate,
          id: id ?? '',
        });

        toasts.addSuccess({
          title: i18n.UPDATE_SUCCESS_TOAST_TITLE(name ?? ''),
          text: i18n.UPDATE_SUCCESS_TOAST_TEXT,
        });

        setShowUpdateConnector(false);

        updateFieldValues({
          isDeprecated: res.isDeprecated,
          config: updatedConnector.config,
        });
      } catch (err) {
        setUpdateErrorMessage(err.message);
      }
    },
    [name, id, getApplicationInfo, isDeprecated, actionTypeId, http, updateFieldValues, toasts]
  );

  return (
    <>
      {actionTypeId && showUpdateConnector && (
        <UpdateConnector
          actionTypeId={actionTypeId}
          readOnly={readOnly}
          isLoading={isLoading}
          updateErrorMessage={updateErrorMessage}
          onConfirm={onUpdateConnectorConfirm}
          onCancel={onModalCancel}
          isOAuth={isOAuth}
        />
      )}
      {requiresNewApplication && (
        <InstallationCallout appId={snExternalServiceConfig[action.actionTypeId]?.appId ?? ''} />
      )}
      {!requiresNewApplication && <SpacedDeprecatedCallout onMigrate={onMigrateClick} />}
      <UseField
        path="config.usesTableApi"
        component={HiddenField}
        config={{ defaultValue: false }}
      />

      <Credentials readOnly={readOnly} isLoading={isLoading} isOAuth={isOAuth} />
    </>
  );
};

const SpacedDeprecatedCallout = ({ onMigrate }: { onMigrate: () => void }) => (
  <>
    <EuiSpacer size="s" />
    <DeprecatedCallout onMigrate={onMigrate} />
  </>
);
