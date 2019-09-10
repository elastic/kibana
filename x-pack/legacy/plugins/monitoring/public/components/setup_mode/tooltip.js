/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import {
  EuiBadge,
  EuiFlexItem,
  EuiToolTip,
  EuiLink
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIdentifier } from './formatting';

export function SetupModeTooltip({ setupModeData, badgeClickAction, productName }) {
  if (!setupModeData) {
    return null;
  }

  const {
    totalUniqueInstanceCount,
    totalUniqueFullyMigratedCount,
    totalUniquePartiallyMigratedCount
  } = setupModeData;
  const allMonitoredByMetricbeat = totalUniqueInstanceCount > 0 &&
    (totalUniqueFullyMigratedCount === totalUniqueInstanceCount || totalUniquePartiallyMigratedCount === totalUniqueInstanceCount);
  const internalCollectionOn = totalUniquePartiallyMigratedCount > 0;
  const mightExist = get(setupModeData, 'detected.mightExist');

  let tooltip = null;

  if (totalUniqueInstanceCount === 0) {
    if (mightExist) {
      tooltip = (
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.monitoring.setupMode.tooltip.mightExist', {
            defaultMessage: `We detected usage of this product. Click to start monitoring.`,
          })}
        >
          <EuiLink onClick={badgeClickAction}>
            <EuiBadge color="warning" iconType="flag">
              {i18n.translate('xpack.monitoring.setupMode.tooltip.detected', {
                defaultMessage: 'Detected'
              })}
            </EuiBadge>
          </EuiLink>
        </EuiToolTip>
      );
    }
    else {
      tooltip = (
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.monitoring.setupMode.tooltip.mightExist', {
            defaultMessage: `We did not detect any usage.`,
          })}
        >
          <EuiLink onClick={badgeClickAction}>
            <EuiBadge color="hollow" iconType="flag">
              {i18n.translate('xpack.monitoring.setupMode.tooltip.noMonitoring', {
                defaultMessage: 'No monitoring'
              })}
            </EuiBadge>
          </EuiLink>
        </EuiToolTip>
      );
    }
  }

  else if (!allMonitoredByMetricbeat) {
    tooltip = (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.monitoring.setupMode.tooltip.oneInternal', {
          defaultMessage: `At least one {identifier} isn’t monitored using Metricbeat.
          Click to get the status of each {identifier}.`,
          values: {
            identifier: getIdentifier(productName)
          }
        })}
      >
        <EuiLink onClick={badgeClickAction}>
          <EuiBadge color="danger" iconType="flag">
            {i18n.translate('xpack.monitoring.euiTable.isInternalCollectorLabel', {
              defaultMessage: 'Internal collection'
            })}
          </EuiBadge>
        </EuiLink>
      </EuiToolTip>
    );
  }
  else if (internalCollectionOn) {
    tooltip = (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.monitoring.setupMode.tooltip.disableInternal', {
          defaultMessage: `Metricbeat is monitoring all {identifierPlural}.
          Click to go to the {identifierPlural} view and disable internal collection.`,
          values: {
            identifierPlural: getIdentifier(productName, true)
          }
        })}
      >
        <EuiLink onClick={badgeClickAction}>
          <EuiBadge color="warning" iconType="flag">
            {i18n.translate('xpack.monitoring.euiTable.isPartiallyMigratedLabel', {
              defaultMessage: 'Internal collection and Metricbeat collection'
            })}
          </EuiBadge>
        </EuiLink>
      </EuiToolTip>
    );
  }
  else {
    tooltip = (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.monitoring.setupMode.tooltip.allSet', {
          defaultMessage: `Metricbeat is monitoring all {identifierPlural}.`,
          values: {
            identifierPlural: getIdentifier(productName, true)
          }
        })}
      >
        <EuiLink onClick={badgeClickAction}>
          <EuiBadge color="secondary" iconType="flag">
            {i18n.translate('xpack.monitoring.euiTable.isFullyMigratedLabel', {
              defaultMessage: 'Metricbeat collection'
            })}
          </EuiBadge>
        </EuiLink>
      </EuiToolTip>
    );
  }

  return (
    <EuiFlexItem grow={false}>
      {tooltip}
    </EuiFlexItem>
  );
}
