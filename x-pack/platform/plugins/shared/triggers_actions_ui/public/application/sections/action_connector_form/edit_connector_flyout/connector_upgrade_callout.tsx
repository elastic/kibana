/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import semverGt from 'semver/functions/gt';
import semverValid from 'semver/functions/valid';
import { EuiButton, EuiCallOut, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActionConnector } from '../../../../types';
import type { ConnectorUpgradeState } from './use_connector_upgrade';

interface ConnectorUpgradeCalloutProps {
  connector: ActionConnector;
  isSpecConnector: boolean;
  isFormModified: boolean;
  isBusy: boolean;
  state: ConnectorUpgradeState;
  onUpgrade: () => void;
}

const isUpgradeAvailable = (pinnedVersion?: string, activeVersion?: string): boolean => {
  if (pinnedVersion === undefined || activeVersion === undefined) {
    return false;
  }

  const validPinnedVersion = semverValid(pinnedVersion);
  const validActiveVersion = semverValid(activeVersion);
  if (validPinnedVersion === null || validActiveVersion === null) {
    return false;
  }

  return semverGt(validActiveVersion, validPinnedVersion);
};

export const ConnectorUpgradeCallout = ({
  connector,
  isSpecConnector,
  isFormModified,
  isBusy,
  state,
  onUpgrade,
}: ConnectorUpgradeCalloutProps) => {
  const hasConnectorUpdate =
    isSpecConnector &&
    !connector.isPreconfigured &&
    !connector.isSystemAction &&
    isUpgradeAvailable(connector.specVersion, connector.activeSpecVersion);

  if (!hasConnectorUpdate && state.status === 'idle') {
    return null;
  }

  const updateButton = (
    <EuiButton
      size="s"
      isLoading={state.status === 'loading'}
      disabled={isFormModified || isBusy}
      onClick={onUpgrade}
      data-test-subj="connector-upgrade-button"
    >
      {i18n.translate('xpack.triggersActionsUI.sections.editConnectorForm.connectorUpgradeButton', {
        defaultMessage: 'Update',
      })}
    </EuiButton>
  );

  return (
    <>
      {hasConnectorUpdate && (
        <>
          <EuiCallOut
            announceOnMount={false}
            size="s"
            color="primary"
            iconType="download"
            data-test-subj="connector-upgrade-callout"
            title={i18n.translate(
              'xpack.triggersActionsUI.sections.editConnectorForm.connectorUpgradeAvailable',
              {
                defaultMessage: 'Update available: {activeVersion}',
                values: { activeVersion: connector.activeSpecVersion },
              }
            )}
          >
            {isFormModified ? (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.triggersActionsUI.sections.editConnectorForm.connectorUpgradeUnsavedChanges',
                  {
                    defaultMessage: 'Save or discard your unsaved changes before updating.',
                  }
                )}
              >
                <span tabIndex={0}>{updateButton}</span>
              </EuiToolTip>
            ) : (
              updateButton
            )}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {state.status === 'success' && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="success"
            iconType="check"
            data-test-subj="connector-upgrade-success"
            title={i18n.translate(
              'xpack.triggersActionsUI.sections.editConnectorForm.connectorUpgradeSuccess',
              {
                defaultMessage: 'Connector updated to {version}',
                values: { version: state.toVersion },
              }
            )}
          />
          <EuiSpacer size="m" />
        </>
      )}

      {state.status === 'reconfiguration_required' && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="warning"
            data-test-subj="connector-upgrade-reconfiguration-required"
            title={i18n.translate(
              'xpack.triggersActionsUI.sections.editConnectorForm.connectorUpgradeReconfigurationRequired',
              {
                defaultMessage: 'Reconfiguration is required before this connector can be updated.',
              }
            )}
          />
          <EuiSpacer size="m" />
        </>
      )}

      {state.status === 'error' && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            iconType="error"
            data-test-subj="connector-upgrade-error"
            title={i18n.translate(
              'xpack.triggersActionsUI.sections.editConnectorForm.connectorUpgradeError',
              {
                defaultMessage: 'Connector update failed. Try again.',
              }
            )}
          />
          <EuiSpacer size="m" />
        </>
      )}
    </>
  );
};
