/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import type { ActionConnector } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { loadActionTypes, upgradeActionConnector } from '../../../lib/action_connector_api';

export interface SpecVersionCalloutProps {
  connector: ActionConnector;
  /** False while the form has unsaved edits or the user cannot save connectors. */
  canUpgrade: boolean;
  onConnectorUpdated?: (connector: ActionConnector) => void;
}

const CONNECTOR_TYPES_QUERY_KEY = 'connectorTypesForSpecVersion';

/**
 * Tells the user when the connector is pinned to an older spec version than the catalog-active
 * one and offers the explicit upgrade.
 */
export const SpecVersionCallout: React.FC<SpecVersionCalloutProps> = ({
  connector,
  canUpgrade,
  onConnectorUpdated,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { data: activeVersion } = useQuery<string | undefined, Error>({
    queryKey: [CONNECTOR_TYPES_QUERY_KEY, connector.actionTypeId],
    queryFn: async () => {
      const types = await loadActionTypes({ http, includeSystemActions: false });
      return types.find((type) => type.id === connector.actionTypeId)?.specVersion;
    },
    enabled: connector.specVersion !== undefined,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const onUpgrade = useCallback(async () => {
    if (activeVersion === undefined) {
      return;
    }
    setIsUpgrading(true);
    try {
      const upgraded = await upgradeActionConnector({
        http,
        id: connector.id,
        specVersion: activeVersion,
      });
      toasts.addSuccess(
        i18n.translate('xpack.triggersActionsUI.sections.editConnectorForm.specVersionUpgraded', {
          defaultMessage: "Upgraded ''{connectorName}'' to spec version {specVersion}",
          values: { connectorName: upgraded.name, specVersion: activeVersion },
        })
      );
      onConnectorUpdated?.(upgraded);
    } catch (error) {
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.editConnectorForm.specVersionUpgradeFailed',
          { defaultMessage: 'Unable to upgrade the connector.' }
        ),
        toastMessage: error.body?.message ?? error.message,
      });
    } finally {
      setIsUpgrading(false);
    }
  }, [activeVersion, connector.id, http, onConnectorUpdated, toasts]);

  if (
    connector.specVersion === undefined ||
    activeVersion === undefined ||
    activeVersion === connector.specVersion
  ) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        announceOnMount
        size="s"
        color="primary"
        iconType="info"
        data-test-subj="connector-spec-version-callout"
        title={i18n.translate(
          'xpack.triggersActionsUI.sections.editConnectorForm.specVersionOutdatedTitle',
          {
            defaultMessage: 'A newer connector version is available',
          }
        )}
      >
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.editConnectorForm.specVersionOutdatedDescription"
            defaultMessage="This connector runs on spec version {pinned}. Version {active} is active in the catalog. Upgrading validates the saved configuration against the new version and keeps this connector on it."
            values={{ pinned: connector.specVersion, active: activeVersion }}
          />
        </p>
        <EuiButton
          size="s"
          fill
          isLoading={isUpgrading}
          isDisabled={!canUpgrade || isUpgrading}
          onClick={onUpgrade}
          data-test-subj="connector-spec-version-upgrade"
        >
          {i18n.translate(
            'xpack.triggersActionsUI.sections.editConnectorForm.specVersionUpgradeButton',
            {
              defaultMessage: 'Upgrade to {active}',
              values: { active: activeVersion },
            }
          )}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
