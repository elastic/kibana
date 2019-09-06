/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiLink,
  EuiTextColor,
  EuiIcon
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ELASTICSEARCH_CUSTOM_ID } from '../../../common/constants';

const clickToMonitorWithMetricbeat = i18n.translate('xpack.monitoring.setupMode.clickToMonitorWithMetricbeat', {
  defaultMessage: 'Click to monitor with Metricbeat'
});

export function SetupModeBadge({ setupMode, productName, status, instance }) {
  let useLink = false;

  // Migrating from partially to fully for Elasticsearch involves changing a cluster
  // setting which impacts all nodes in the cluster, which we have a separate callout
  // for. Since it does not make sense to do this on a per node basis, show nothing here
  const explicitlyAvoidLink = status.isPartiallyMigrated && productName === ELASTICSEARCH_CUSTOM_ID;
  if (!explicitlyAvoidLink && (status.isInternalCollector || status.isPartiallyMigrated || status.isNetNewUser)) {
    useLink = true;
  }

  let statusText = null;
  if (status.isInternalCollector) {
    statusText = (
      <Fragment>
        <EuiIcon type="flag" color="danger"/>
        &nbsp;
        <EuiTextColor color="danger" size="xs">
          {clickToMonitorWithMetricbeat}
        </EuiTextColor>
      </Fragment>
    );
  }
  else if (status.isPartiallyMigrated) {
    const text = explicitlyAvoidLink
      ? i18n.translate('xpack.monitoring.setupMode.monitorAllNodes', {
        defaultMessage: 'Monitor all nodes with Metricbeat'
      })
      : i18n.translate('xpack.monitoring.setupMode.clickToDisableInternalCollection', {
        defaultMessage: 'Click to disable internal collection'
      });

    statusText = (
      <Fragment>
        <EuiIcon type="flag" color="warning"/>
        &nbsp;
        <EuiTextColor color="warning" size="xs">
          {text}
        </EuiTextColor>
      </Fragment>
    );
  }
  else if (status.isFullyMigrated) {
    statusText = (
      <Fragment>
        <EuiIcon type="flag" color="primary"/>
        &nbsp;
        <EuiTextColor color="primary" size="xs">
          {i18n.translate('xpack.monitoring.setupMode.usingMetricbeatCollection', {
            defaultMessage: 'Monitored with Metricbeat'
          })}
        </EuiTextColor>
      </Fragment>
    );
  }
  else if (status.isNetNewUser) {
    statusText = (
      <Fragment>
        <EuiIcon type="flag" color="danger"/>
        &nbsp;
        <EuiTextColor color="danger" size="xs">
          {clickToMonitorWithMetricbeat}
        </EuiTextColor>
      </Fragment>
    );
  }
  else {
    statusText = (
      <Fragment>
        <EuiIcon type="flag" color="danger"/>
        &nbsp;
        <EuiTextColor color="danger" size="xs">
          {i18n.translate('xpack.monitoring.setupMode.unknown', {
            defaultMessage: 'N/A'
          })}
        </EuiTextColor>
      </Fragment>
    );
  }

  if (useLink) {
    return (
      <EuiLink onClick={() => setupMode.openFlyout(instance)}>
        {statusText}
      </EuiLink>
    );
  }

  return statusText;
}
