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
import { toggleSetupMode, getSetupModeState, addSetupModeCallback } from '../../lib/setup_mode';
import {
  ALERT_ACTION_TYPE_EMAIL,
  CLUSTER_ALERTS_TO_BLACKLIST,
  CLUSTER_ALERT_ID_TO_KIBANA_ALERT_TYPE_ID
} from '../../../common/constants';
import { CreateActionModal } from './create_action_modal';
import { SelectActionModal } from './select_action.modal';

// Note: This is currently not rendered
export function MigrationStatus({ clusterUuid }) {
  const [setupModeEnabled, setSetupModeEnabled] = React.useState(getSetupModeState().enabled);
  const [isCreating, setIsCreating] = React.useState(false);
  const [showCallOut, setShowCallOut] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [kibanaAlerts, setKibanaAlerts] = React.useState([]);
  const [emailActions, setEmailActions] = React.useState([]);
  const [showCreateActionModal, setShowCreateActionModal] = React.useState(false);
  const [showEditActionModal, setShowEditActionModal] = React.useState(false);
  const [editAction, setEditAction] = React.useState(false);
  const [showSelectActionModal, setShowSelectActionModal] = React.useState(false);
  const [selectedEmailActionId, setSelectedEmailActionId] = React.useState(null);

  React.useEffect(() => {
    async function fetchMigrationStatus() {
      const kibanaAlerts = await kfetch({ method: 'GET', pathname: `/api/alert/_find` });

      setKibanaAlerts(kibanaAlerts.data);
      await fetchEmailActions();

      if (kibanaAlerts.total === 0) {
        if (setupModeEnabled) {
          setShowCreate(true);
          setShowCallOut(false);
        }
        else {
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
      pathname: `/api/action/_find`
    });

    const emailActions = kibanaActions.data.filter(action => action.actionTypeId === ALERT_ACTION_TYPE_EMAIL);
    emailActions.length && setSelectedEmailActionId(emailActions[0].id);
    setEmailActions(emailActions);
  }

  async function createKibanaAlerts() {
    setIsCreating(true);

    const { alerts } = await kfetch({
      method: 'POST',
      pathname: `/api/monitoring/v1/clusters/${clusterUuid}/alerts`,
      body: JSON.stringify({ selectedEmailActionId })
    });

    setIsCreating(false);
    setShowCreate(false);
    setKibanaAlerts([
      ...kibanaAlerts,
      ...alerts,
    ]);
  }

  async function createEmailAction(data) {
    if (editAction) {
      await kfetch({
        method: 'PUT',
        pathname: `/api/action/${editAction.id}`,
        body: JSON.stringify({
          description: editAction.description,
          config: omit(data, ['user', 'password']),
          secrets: pick(data, ['user', 'password'])
        })
      });
    }
    else {
      await kfetch({
        method: 'POST',
        pathname: '/api/action',
        body: JSON.stringify({
          description: 'Sends an email',
          actionTypeId: ALERT_ACTION_TYPE_EMAIL,
          config: omit(data, ['user', 'password']),
          secrets: pick(data, ['user', 'password'])
        })
      });
    }

    await fetchEmailActions();
  }

  function selectAction() {
    if (emailActions.length === 0) {
      setShowCreateActionModal(true);
    }
    else {
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
        createEmailAction={async data => {
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
        onClickEdit={action => {
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
    const missingAlerts = CLUSTER_ALERTS_TO_BLACKLIST.filter(clusterAlert => {
      if (kibanaAlerts.find(alert => alert.alertTypeId === CLUSTER_ALERT_ID_TO_KIBANA_ALERT_TYPE_ID[clusterAlert])) {
        return false;
      }
      return true;
    });

    if (missingAlerts.length === 0) {
      if (setupModeEnabled) {
        return (
          <EuiCallOut
            color="success"
            title="Kibana alerting is up to date!"
            iconType="flag"
            size="s"
          />
        );
      }
    }

    if (showCreate) {
      return (
        <EuiCallOut
          color="warning"
          title="Migrate cluster alerts to Kibana alerting"
          iconType="flag"
        >
          <p>
            There are existing cluster alerts that are eligible to migrate to Kibana alerting! Click the button below to migrate.
          </p>
          <EuiButton onClick={selectAction} isLoading={isCreating}>
            Migrate {missingAlerts.length} cluster alert(s) to Kibana alerting
          </EuiButton>
          {renderCreateActionModal()}
          {renderSelectActionModal()}
        </EuiCallOut>
      );
    }

    if (showCallOut) {
      return (
        <EuiCallOut
          color="warning"
          title="Migrate cluster alert to Kibana alerting"
        >
          <p>
            Some cluster alerts need to be migrated to Kibana alerting.&nbsp;
            <EuiLink onClick={() => toggleSetupMode(true)}>Enter Setup mode</EuiLink> to start the process.
          </p>
        </EuiCallOut>
      );
    }

    return null;
  }

  const content = renderContent();
  if (content) {
    return (
      <Fragment>
        <EuiTitle>
          <h4>Kibana Alerting</h4>
        </EuiTitle>
        <EuiSpacer/>
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            {content}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer/>
      </Fragment>
    );
  }

  return null;
}
