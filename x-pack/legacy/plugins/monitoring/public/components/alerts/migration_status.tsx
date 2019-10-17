/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { omit, pick } from 'lodash';
import { kfetch } from 'ui/kfetch';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLink,
  EuiCallOut,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionResult } from '../../../../actions/server/types';
import { Alert } from '../../../../alerting/server/types';
import { toggleSetupMode, getSetupModeState, addSetupModeCallback } from '../../lib/setup_mode';
import {
  ALERT_ACTION_TYPE_EMAIL,
  NUMBER_OF_LEGACY_CLUSTER_ALERTS,
  KIBANA_ALERTING_ENABLED,
} from '../../../common/constants';
import { CreateActionModal } from './create_action_modal';
import { SelectActionModal } from './select_action.modal';
import { EmailActionData } from './manage_email_action';

interface MigrationStatusProps {
  clusterUuid: string;
}

export const MigrationStatus: React.FC<MigrationStatusProps> = (props: MigrationStatusProps) => {
  const { clusterUuid } = props;

  const [setupModeEnabled, setSetupModeEnabled] = React.useState(getSetupModeState().enabled);
  const [isCreating, setIsCreating] = React.useState(false);
  const [showCallOut, setShowCallOut] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [kibanaAlerts, setKibanaAlerts] = React.useState<Alert[]>([]);
  const [emailActions, setEmailActions] = React.useState([]);
  const [showCreateActionModal, setShowCreateActionModal] = React.useState(false);
  const [showEditActionModal, setShowEditActionModal] = React.useState(false);
  const [editAction, setEditAction] = React.useState<ActionResult | null>(null);
  const [showSelectActionModal, setShowSelectActionModal] = React.useState(false);
  const [selectedEmailActionId, setSelectedEmailActionId] = React.useState(null);

  React.useEffect(() => {
    async function fetchMigrationStatus() {
      const alerts = await kfetch({ method: 'GET', pathname: `/api/alert/_find` });

      setKibanaAlerts(alerts.data);
      await fetchEmailActions();

      if (alerts.total === 0) {
        if (setupModeEnabled) {
          setShowCreate(true);
          setShowCallOut(false);
        } else {
          setShowCreate(false);
          setShowCallOut(true);
        }
      }
    }

    fetchMigrationStatus();
  }, [clusterUuid, setupModeEnabled]);

  addSetupModeCallback(() => setSetupModeEnabled(getSetupModeState().enabled));

  async function fetchEmailActions() {
    const kibanaActions = await kfetch({
      method: 'GET',
      pathname: `/api/action/_find`,
    });

    const actions = kibanaActions.data.filter(
      (action: ActionResult) => action.actionTypeId === ALERT_ACTION_TYPE_EMAIL
    );
    if (actions.length > 0) {
      setSelectedEmailActionId(actions[0].id);
    }
    setEmailActions(actions);
  }

  async function createKibanaAlerts() {
    setIsCreating(true);

    const { alerts } = await kfetch({
      method: 'POST',
      pathname: `/api/monitoring/v1/clusters/${clusterUuid}/alerts`,
      body: JSON.stringify({ selectedEmailActionId }),
    });

    setIsCreating(false);
    setShowCreate(false);
    setKibanaAlerts([...kibanaAlerts, ...alerts]);
  }

  async function createEmailAction(data: EmailActionData) {
    if (editAction) {
      await kfetch({
        method: 'PUT',
        pathname: `/api/action/${editAction.id}`,
        body: JSON.stringify({
          description: editAction.description,
          config: omit(data, ['user', 'password']),
          secrets: pick(data, ['user', 'password']),
        }),
      });
    } else {
      await kfetch({
        method: 'POST',
        pathname: '/api/action',
        body: JSON.stringify({
          description: i18n.translate('xpack.monitoring.alerts.actions.emailAction.description', {
            defaultMessage: 'Kibana alerting is up to date!',
          }),
          actionTypeId: ALERT_ACTION_TYPE_EMAIL,
          config: omit(data, ['user', 'password']),
          secrets: pick(data, ['user', 'password']),
        }),
      });
    }

    await fetchEmailActions();
  }

  function selectAction() {
    if (emailActions.length === 0) {
      setShowCreateActionModal(true);
    } else {
      setShowSelectActionModal(true);
    }
  }

  function renderCreateActionModal() {
    if (!showCreateActionModal && !showEditActionModal) {
      return null;
    }

    return (
      <CreateActionModal
        onClose={() => setShowCreateActionModal(false)}
        createEmailAction={async (data: EmailActionData) => {
          await createEmailAction(data);
          setShowCreateActionModal(false);
          setShowEditActionModal(false);
          setShowSelectActionModal(true);
        }}
        isNew={showCreateActionModal}
        editAction={editAction}
      />
    );
  }

  function renderSelectActionModal() {
    if (!showSelectActionModal) {
      return null;
    }

    return (
      <SelectActionModal
        emailActions={emailActions}
        onClose={() => setShowSelectActionModal(false)}
        createKibanaAlerts={createKibanaAlerts}
        onClickEdit={(action: ActionResult) => {
          setShowSelectActionModal(false);
          setEditAction(action);
          setShowEditActionModal(true);
        }}
        selectedEmailActionId={selectedEmailActionId}
        setSelectedEmailActionId={setSelectedEmailActionId}
      />
    );
  }

  function renderContent() {
    const missingAlertCount = NUMBER_OF_LEGACY_CLUSTER_ALERTS - kibanaAlerts.length;

    if (missingAlertCount === 0) {
      if (setupModeEnabled) {
        return (
          <EuiCallOut
            color="success"
            title={i18n.translate('xpack.monitoring.alerts.migrate.upToDate', {
              defaultMessage: 'Kibana alerting is up to date!',
            })}
            iconType="flag"
            size="s"
          />
        );
      }
    }

    const needToMigrateLabel = i18n.translate('xpack.monitoring.alerts.migrate.needToMigrate', {
      defaultMessage: 'Migrate cluster alerts to Kibana alerting',
    });
    if (showCreate) {
      return (
        <EuiCallOut color="warning" title={needToMigrateLabel} iconType="flag">
          <EuiButton onClick={selectAction} isLoading={isCreating}>
            {i18n.translate('xpack.monitoring.alerts.migrate.migrateActionBtn', {
              defaultMessage: 'Migrate {missingAlertCount} cluster alert(s) to Kibana alerting',
              values: {
                missingAlertCount,
              },
            })}
          </EuiButton>
          {renderCreateActionModal()}
          {renderSelectActionModal()}
        </EuiCallOut>
      );
    }

    if (showCallOut) {
      return (
        <EuiCallOut color="warning" title={needToMigrateLabel}>
          <p>
            {i18n.translate('xpack.monitoring.alerts.migrate.outsideOfSetupModeText', {
              defaultMessage: 'Some cluster alerts need to be migrated to Kibana alerting.',
              values: {
                missingAlertCount,
              },
            })}
            &nbsp;
            <EuiLink onClick={() => toggleSetupMode(true)}>
              {i18n.translate('xpack.monitoring.alerts.migrate.outsideOfSetupModeLinkText', {
                defaultMessage: 'Enter Setup mode to start the process.',
                values: {
                  missingAlertCount,
                },
              })}
            </EuiLink>
          </p>
        </EuiCallOut>
      );
    }

    return null;
  }

  if (!KIBANA_ALERTING_ENABLED) {
    return null;
  }

  const content = renderContent();
  if (content) {
    return (
      <Fragment>
        <EuiTitle>
          <h4>
            {i18n.translate('xpack.monitoring.alerts.migrate.title', {
              defaultMessage: 'Kibana alerting',
            })}
          </h4>
        </EuiTitle>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>{content}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
      </Fragment>
    );
  }

  return null;
};
