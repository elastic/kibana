/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { capitalize, get } from 'lodash';
import {
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  NODE_IDENTIFIER_PLURAL,
  INSTANCE_IDENTIFIER_PLURAL,
  NODE_IDENTIFIER_SINGULAR,
  INSTANCE_IDENTIFIER_SINGULAR
} from './common_text';

export function ListingCallOut({ setupModeData, productName, useNodeIdentifier = false, customRenderer = null }) {
  if (customRenderer) {
    const { shouldRender, componentToRender } = customRenderer();
    if (shouldRender) {
      return componentToRender;
    }
  }

  const mightExist = get(setupModeData, 'detected.mightExist');

  const hasInstances = setupModeData.totalUniqueInstanceCount > 0;
  if (!hasInstances) {
    if (mightExist) {
      return (
        <Fragment>
          <EuiCallOut
            title={i18n.translate('xpack.monitoring.setupMode.detectedNodeTitle', {
              defaultMessage: '{product} {identifier} detected',
              values: {
                product: capitalize(productName),
                identifier: useNodeIdentifier ? NODE_IDENTIFIER_SINGULAR : INSTANCE_IDENTIFIER_SINGULAR
              }
            })}
            color="warning"
            iconType="flag"
          >
            <p>
              {i18n.translate('xpack.monitoring.setupMode.detectedNodeDescription', {
                defaultMessage: `Based on your indices, we think you might have a {product} {identifier}. Click 'Set up monitoring'
                below to start monitoring this {identifier}.`,
                values: {
                  product: capitalize(productName),
                  identifier: useNodeIdentifier ? NODE_IDENTIFIER_SINGULAR : INSTANCE_IDENTIFIER_SINGULAR
                }
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m"/>
        </Fragment>
      );
    }
    return (
      <Fragment>
        <EuiCallOut
          title={i18n.translate('xpack.monitoring.setupMode.noMonitoringDataFound', {
            defaultMessage: 'No monitoring data found',
          })}
          color="danger"
          iconType="flag"
        >
          <p>
            {i18n.translate('xpack.monitoring.setupMode.netNewUserDescription', {
              defaultMessage: `But we did find the following {product} {identifier} that require monitoring setup.`,
              values: {
                product: capitalize(productName),
                identifier: useNodeIdentifier ? NODE_IDENTIFIER_PLURAL : INSTANCE_IDENTIFIER_PLURAL
              }
            })}
          </p>
        </EuiCallOut>
        <EuiSpacer size="m"/>
      </Fragment>
    );
  }

  if (setupModeData.totalUniqueFullyMigratedCount === setupModeData.totalUniqueInstanceCount) {
    return (
      <Fragment>
        <EuiCallOut
          title={i18n.translate('xpack.monitoring.setupMode.metricbeatAllNodes', {
            defaultMessage: 'Metricbeat is monitoring all {identifer}.',
            values: {
              identifier: useNodeIdentifier ? NODE_IDENTIFIER_PLURAL : INSTANCE_IDENTIFIER_PLURAL
            }
          })}
          color="success"
          iconType="flag"
        />
        <EuiSpacer size="m"/>
      </Fragment>
    );
  }

  if (setupModeData.totalUniquePartiallyMigratedCount === setupModeData.totalUniqueInstanceCount) {
    return (
      <Fragment>
        <EuiCallOut
          title={i18n.translate('xpack.monitoring.setupMode.disableInternalCollectionTitle', {
            defaultMessage: 'Disable internal collection',
          })}
          color="warning"
          iconType="flag"
        >
          <p>
            {i18n.translate('xpack.monitoring.setupMode.disableInternalCollectionDescription', {
              defaultMessage: `Metricbeat is now monitoring your {product} {identifier}.
              Disable internal collection to finish the migration.`,
              values: {
                product: capitalize(productName),
                identifier: useNodeIdentifier ? NODE_IDENTIFIER_PLURAL : INSTANCE_IDENTIFIER_PLURAL
              }
            })}
          </p>
        </EuiCallOut>
        <EuiSpacer size="m"/>
      </Fragment>
    );
  }

  if (setupModeData.totalUniqueInstanceCount > 0 &&
      setupModeData.totalUniqueFullyMigratedCount === 0 && setupModeData.totalUniquePartiallyMigratedCount === 0) {
    return (
      <Fragment>
        <EuiCallOut
          title={i18n.translate('xpack.monitoring.setupMode.migrateToMetricbeat', {
            defaultMessage: 'Migrate to Metricbeat',
          })}
          color="danger"
          iconType="flag"
        >
          <p>
            {i18n.translate('xpack.monitoring.setupMode.disableInternalCollectionDescription', {
              defaultMessage: `These {product} {identifier} are monitored through internal collection. Migrate to monitor with Metricbeat.`,
              values: {
                product: capitalize(productName),
                identifier: useNodeIdentifier ? NODE_IDENTIFIER_PLURAL : INSTANCE_IDENTIFIER_PLURAL
              }
            })}
          </p>
        </EuiCallOut>
        <EuiSpacer size="m"/>
      </Fragment>
    );
  }

  return null;
}
