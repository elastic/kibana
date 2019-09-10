/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiTextColor,
  EuiIcon,
  EuiBadge
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ELASTICSEARCH_SYSTEM_ID } from '../../../common/constants';

const clickToMonitorWithMetricbeat = i18n.translate('xpack.monitoring.setupMode.clickToMonitorWithMetricbeat', {
  defaultMessage: 'Monitor with Metricbeat'
});

const clickToDisableInternalCollection = i18n.translate('xpack.monitoring.setupMode.clickToDisableInternalCollection', {
  defaultMessage: 'Disable internal collection'
});

export function SetupModeBadge({ setupMode, productName, status, instance, clusterUuid }) {
  let customAction = null;
  let customText = null;

  const setupModeData = setupMode.data || {};
  const setupModeMeta = setupMode.meta || {};

  // Migrating from partially to fully for Elasticsearch involves changing a cluster
  // setting which impacts all nodes in the cluster so the action text needs to reflect that
  const allPartiallyMigrated = setupModeData.totalUniquePartiallyMigratedCount === setupModeData.totalUniqueInstanceCount;

  if (status.isPartiallyMigrated && productName === ELASTICSEARCH_SYSTEM_ID) {
    if (allPartiallyMigrated) {
      customText = clickToDisableInternalCollection;
      if (setupModeMeta.liveClusterUuid === clusterUuid) {
        customAction = setupMode.shortcutToFinishMigration;
      }
    }
    else {
      return (
        <Fragment>
          <EuiIcon type="flag"/>
          &nbsp;
          <EuiTextColor color="warning" size="xs">
            {i18n.translate('xpack.monitoring.setupMode.monitorAllNodes', {
              defaultMessage: 'Monitor all nodes with Metricbeat'
            })}
          </EuiTextColor>
        </Fragment>
      );
    }
  }

  const badgeProps = {};
  if (status.isInternalCollector || status.isPartiallyMigrated || status.isNetNewUser) {
    badgeProps.onClick = customAction ? customAction : () => setupMode.openFlyout(instance);
  }


  let statusText = null;
  if (status.isInternalCollector) {
    statusText = (
      <EuiBadge color="danger" iconType="flag" {...badgeProps}>
        {customText || clickToMonitorWithMetricbeat}
      </EuiBadge>
    );
  }
  else if (status.isPartiallyMigrated) {
    statusText = (
      <EuiBadge color="warning" iconType="flag" {...badgeProps}>
        {customText || clickToDisableInternalCollection}
      </EuiBadge>
    );
  }
  else if (status.isFullyMigrated) {
    statusText = (
      <EuiBadge color="primary" iconType="flag" {...badgeProps}>
        {customText || i18n.translate('xpack.monitoring.setupMode.usingMetricbeatCollection', {
          defaultMessage: 'Monitored with Metricbeat'
        })}
      </EuiBadge>
    );
  }
  else if (status.isNetNewUser) {
    statusText = (
      <EuiBadge color="danger" iconType="flag" {...badgeProps}>
        {customText || clickToMonitorWithMetricbeat}
      </EuiBadge>
    );
  }
  else {
    statusText = (
      <EuiBadge color="danger" iconType="flag" {...badgeProps}>
        {customText || i18n.translate('xpack.monitoring.setupMode.unknown', {
          defaultMessage: 'N/A'
        })}
      </EuiBadge>
    );
  }

  return statusText;
}
