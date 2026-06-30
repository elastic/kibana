/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiLink } from '@elastic/eui';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useQueryClient } from '@kbn/react-query';
import type {
  ActionConnector,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import React, { useState } from 'react';
import {
  ALL_CONNECTORS_KEY,
  type SingleStepConnector,
  useFetchConnectorsByType,
} from '../hooks/use_fetch_connectors_by_type';

interface ConnectorSelectorProps {
  connectorTypeId: string;
  value: string | null;
  onChange: (connectorId: string | null) => void;
}

export const ConnectorSelector = ({ connectorTypeId, value, onChange }: ConnectorSelectorProps) => {
  const { data: connectors = [], isLoading } = useFetchConnectorsByType({ connectorTypeId });
  const triggersActionsUi = useService(
    PluginStart('triggersActionsUi')
  ) as TriggersAndActionsUIPublicPluginStart;
  const application = useService(CoreStart('application'));
  const http = useService(CoreStart('http'));
  const uiSettings = useService(CoreStart('uiSettings'));
  const settings = useService(CoreStart('settings'));
  const notifications = useService(CoreStart('notifications'));
  const docLinks = useService(CoreStart('docLinks'));
  const queryClient = useQueryClient();
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = useState(false);

  // The connector flyout from triggers_actions_ui resolves core services via the kibana-react
  // context (useKibana().services), which the alerting_v2 app does not provide because it mounts
  // through core-di. Bridge the required services here so the flyout can render.
  const connectorFlyoutServices = {
    application,
    http,
    uiSettings,
    settings,
    notifications,
    docLinks,
  };

  const handleConnectorCreated = (connector: ActionConnector) => {
    queryClient.setQueryData<SingleStepConnector[]>(ALL_CONNECTORS_KEY, (old = []) => [
      ...old,
      {
        id: connector.id,
        name: connector.name,
        connectorTypeId,
        isMissingSecrets: connector.isMissingSecrets ?? false,
        isDeprecated: false,
      },
    ]);
    onChange(connector.id);
    setIsCreateFlyoutOpen(false);
  };

  const options: Array<EuiComboBoxOptionOption<string>> = connectors.map((connector) => ({
    label: connector.name,
    value: connector.id,
    disabled: connector.isMissingSecrets || connector.isDeprecated,
  }));

  const selected: Array<EuiComboBoxOptionOption<string>> = value
    ? [{ label: connectors.find((c) => c.id === value)?.name ?? value, value }]
    : [];

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.connector.label', {
          defaultMessage: 'Connector',
        })}
        labelAppend={
          <EuiLink
            data-test-subj="singleStepWorkflowCreateConnectorLink"
            onClick={() => setIsCreateFlyoutOpen(true)}
          >
            {i18n.translate('xpack.responseOps.alertingV2RuleForm.actionForm.connector.createNew', {
              defaultMessage: '+ Create new connector',
            })}
          </EuiLink>
        }
        fullWidth
      >
        <EuiComboBox
          fullWidth
          compressed
          singleSelection={{ asPlainText: true }}
          data-test-subj="singleStepWorkflowConnectorSelect"
          isLoading={isLoading}
          placeholder={i18n.translate(
            'xpack.responseOps.alertingV2RuleForm.actionForm.connector.placeholder',
            {
              defaultMessage: 'Select a connector',
            }
          )}
          selectedOptions={selected}
          onChange={(next) => onChange(next[0]?.value ?? null)}
          options={options}
        />
      </EuiFormRow>
      {isCreateFlyoutOpen && (
        <KibanaContextProvider services={connectorFlyoutServices}>
          {triggersActionsUi.getAddConnectorFlyout({
            initialConnector: { actionTypeId: connectorTypeId },
            onClose: () => setIsCreateFlyoutOpen(false),
            onConnectorCreated: handleConnectorCreated,
          })}
        </KibanaContextProvider>
      )}
    </>
  );
};
