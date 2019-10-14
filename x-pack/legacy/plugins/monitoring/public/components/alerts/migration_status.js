/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { kfetch } from 'ui/kfetch';
import {
  EuiButton,
  EuiFlexGrid,
  EuiFlexItem
} from '@elastic/eui';


export function MigrationStatus({ clusterUuid }) {
  const [showCreate, setShowCreate] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);

  React.useEffect(() => {
    async function fetchMigrationStatus() {
      const kibanaAlerts = await kfetch({
        method: 'GET',
        pathname: `/api/alert/_find`
      });

      if (kibanaAlerts.total === 0) {
        setShowCreate(true);
      } else {
        setShowDelete(true);
      }
    }

    fetchMigrationStatus();
  }, [clusterUuid]);

  async function createKibanaAlerts() {
    const result = await kfetch({
      method: 'POST',
      pathname: `/api/monitoring/v1/clusters/${clusterUuid}/alerts`,
    });

    console.log({ result });

    setShowCreate(false);
    setShowDelete(true);
  }

  async function deleteKibanaAlerts() {
    const kibanaAlerts = await kfetch({
      method: 'GET',
      pathname: `/api/alert/_find`
    });
    for (const alert of kibanaAlerts.data) {
      await kfetch({
        method: 'DELETE',
        pathname: '/api/alert/' + alert.id
      });
      console.log(`Deleted alert ${alert.id}`);
    }
    setShowDelete(false);
    setShowCreate(true);
  }

  if (showCreate) {
    return (
      <EuiFlexGrid>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={createKibanaAlerts}>
            Create Kibana Alerts
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  }

  if (showDelete) {
    return (
      <EuiFlexGrid>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={deleteKibanaAlerts}>
            Delete Kibana Alerts
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  }

  return null;
}
