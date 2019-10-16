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
  EuiText,
  EuiButtonEmpty,
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSuperSelect,
  EuiSpacer,
  EuiLink,
  EuiCallOut,
  EuiTitle,
} from '@elastic/eui';
import { toggleSetupMode, getSetupModeState, addSetupModeCallback } from '../../lib/setup_mode';
import { ManageEmailAction } from './manage_email_action';
import {
  ALERT_ACTION_TYPE_EMAIL,
  CLUSTER_ALERTS_TO_BLACKLIST,
  CLUSTER_ALERT_ID_TO_KIBANA_ALERT_TYPE_ID
} from '../../../common/constants';

export function MigrationStatus({ clusterUuid }) {
  const [setupModeEnabled, setSetupModeEnabled] = React.useState(getSetupModeState().enabled);
  const [isCreating, setIsCreating] = React.useState(false);
  // const [isDeleting, setIsDeleting] = React.useState(false);
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

  // async function deleteKibanaAlerts() {
  //   setIsDeleting(true);
  //   const kibanaAlerts = await kfetch({
  //     method: 'GET',
  //     pathname: `/api/alert/_find`
  //   });
  //   for (const alert of kibanaAlerts.data) {
  //     await kfetch({
  //       method: 'DELETE',
  //       pathname: '/api/alert/' + alert.id
  //     });
  //   }
  //   setIsDeleting(false);
  //   setShowCreate(true);
  // }

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
      <EuiOverlayMask>
        <EuiModal onClose={() => setShowCreateActionModal(false)} initialFocus="[name=popswitch]">
          <EuiModalHeader>
            <EuiModalHeaderTitle>Create email action</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText>
              <p>
                Please create an email action to use for Kibana alerts.
              </p>
            </EuiText>
            <EuiSpacer/>
            <ManageEmailAction
              createEmailAction={async data => {
                await createEmailAction(data);
                setShowCreateActionModal(false);
                setShowEditActionModal(false);
                setShowSelectActionModal(true);
              }}
              isNew={showCreateActionModal}
              action={editAction}
            />
          </EuiModalBody>
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  function renderSelectActionModal() {
    if (!showSelectActionModal) {
      return null;
    }

    const options = emailActions.map(action => ({
      value: action.id,
      inputDisplay: (
        <EuiText>
          {action.config.service} from {action.config.from}
          &nbsp;
          <EuiLink
            onClick={() => {
              setShowSelectActionModal(false);
              setEditAction(action);
              setShowEditActionModal(true);
            }}
          >
            edit
          </EuiLink>
        </EuiText>
      ),
      dropdownDisplay: (
        <EuiText>
          {action.config.service} from {action.config.from}
        </EuiText>
      )
    }));

    return (
      <EuiOverlayMask>
        <EuiModal onClose={() => setShowSelectActionModal(false)} initialFocus="[name=popswitch]">
          <EuiModalHeader>
            <EuiModalHeaderTitle>Select email action</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiText>
              <p>
                Please select a configured email action to use for Kibana alerts.
              </p>
            </EuiText>
            <EuiSpacer/>
            <EuiSuperSelect
              options={options}
              valueOfSelected={selectedEmailActionId}
              onChange={id => setSelectedEmailActionId(id)}
            />
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={() => setShowSelectActionModal(false)}>Cancel</EuiButtonEmpty>
            <EuiButton
              onClick={() => {
                setShowSelectActionModal(false);
                selectedEmailActionId && createKibanaAlerts();
              }}
              fill
            >
              Use
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  const missingAlerts = CLUSTER_ALERTS_TO_BLACKLIST.filter(clusterAlert => {
    if (kibanaAlerts.find(alert => alert.alertTypeId === CLUSTER_ALERT_ID_TO_KIBANA_ALERT_TYPE_ID[clusterAlert])) {
      return false;
    }
    return true;
  });

  let content = null;

  if (missingAlerts.length === 0) {
    if (setupModeEnabled) {
      content = (
        <EuiCallOut
          color="success"
          title="Kibana alerting is up to date!"
          iconType="flag"
          size="s"
        />
      );
    }
  }
  else if (showCreate) {
    content = (
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
  else if (showCallOut) {
    content = (
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
