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
import type { ActionConnector, ActionConnectorWithoutId } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { loadActionTypes, updateActionConnector } from '../../../lib/action_connector_api';
import {
  compareSpecVersions,
  isSameMajor,
  newestMajorTarget,
} from '../../../lib/spec_version_compare';

export interface SpecVersionCalloutProps {
  connector: ActionConnector;
  /** False while the form has unsaved edits or the user cannot save connectors. */
  canUpgrade: boolean;
  currentValues: Pick<ActionConnectorWithoutId, 'name' | 'config' | 'secrets'>;
  onConnectorUpdated?: (connector: ActionConnector) => void;
  onValidationFailure: (target: string) => void;
}

const CONNECTOR_TYPES_QUERY_KEY = 'connectorTypesForSpecVersion';

/**
 * Offers an explicit PUT of config + target spec version when a newer catalog version exists.
 */
export const SpecVersionCallout: React.FC<SpecVersionCalloutProps> = ({
  connector,
  canUpgrade,
  currentValues,
  onConnectorUpdated,
  onValidationFailure,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { data: target } = useQuery<string | undefined, Error>({
    queryKey: [CONNECTOR_TYPES_QUERY_KEY, connector.actionTypeId],
    queryFn: async () => {
      const types = await loadActionTypes({ http, includeSystemActions: false });
      const type = types.find((candidate) => candidate.id === connector.actionTypeId);
      return newestMajorTarget(type?.specVersions) ?? type?.specVersion;
    },
    enabled: connector.specVersion !== undefined,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const pin = connector.specVersion;
  const showCallout =
    pin !== undefined && target !== undefined && compareSpecVersions(target, pin) > 0;

  const onUpgrade = useCallback(async () => {
    if (target === undefined) {
      return;
    }
    setIsUpgrading(true);
    try {
      const upgraded = await updateActionConnector({
        http,
        id: connector.id,
        connector: {
          name: currentValues.name,
          config: currentValues.config,
          secrets: currentValues.secrets,
          specVersion: target,
        },
      });
      toasts.addSuccess(
        i18n.translate('xpack.triggersActionsUI.sections.editConnectorForm.specVersionUpdated', {
          defaultMessage: "Updated ''{connectorName}'' to spec version {specVersion}",
          values: { connectorName: upgraded.name, specVersion: target },
        })
      );
      onConnectorUpdated?.(upgraded);
    } catch (error) {
      const statusCode = error.body?.statusCode ?? error.statusCode;
      if (statusCode === 400) {
        onValidationFailure(target);
      }
      toasts.addError(error, {
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.editConnectorForm.specVersionUpdateFailed',
          { defaultMessage: 'Unable to update the connector version.' }
        ),
        toastMessage: error.body?.message ?? error.message,
      });
    } finally {
      setIsUpgrading(false);
    }
  }, [
    connector.id,
    currentValues.config,
    currentValues.name,
    currentValues.secrets,
    http,
    onConnectorUpdated,
    onValidationFailure,
    target,
    toasts,
  ]);

  if (!showCallout || target === undefined || pin === undefined) {
    return null;
  }

  const sameMajor = isSameMajor(pin, target);

  return (
    <>
      <EuiCallOut
        announceOnMount
        size="s"
        color="primary"
        iconType="info"
        data-test-subj="connector-spec-version-callout"
        title={
          sameMajor
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.editConnectorForm.specVersionSameMajorTitle',
                {
                  defaultMessage: 'A newer connector version is available',
                }
              )
            : i18n.translate(
                'xpack.triggersActionsUI.sections.editConnectorForm.specVersionNewMajorTitle',
                {
                  defaultMessage: 'Version {major} available, configuration may need changes',
                  values: { major: target.split('.')[0] },
                }
              )
        }
      >
        <p>
          {sameMajor ? (
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.editConnectorForm.specVersionSameMajorDescription"
              defaultMessage="This connector runs on spec version {pinned}. Version {target} is the latest of the same major. Updating validates the saved configuration against the new version and keeps this connector on it."
              values={{ pinned: pin, target }}
            />
          ) : (
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.editConnectorForm.specVersionNewMajorDescription"
              defaultMessage="This connector runs on spec version {pinned}. Version {target} is a new major and may require configuration changes."
              values={{ pinned: pin, target }}
            />
          )}
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
            'xpack.triggersActionsUI.sections.editConnectorForm.specVersionUpdateButton',
            {
              defaultMessage: 'Update to {target}',
              values: { target },
            }
          )}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
