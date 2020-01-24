/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
  This is a temporary deprecation warning that will be valid for the span of 7.7.0 - 8.0.0.
  Keeping most of the logic in one file so it's easier to remove after 8.0
  Context: https://github.com/elastic/stack-monitoring-dev/issues/76
*/

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import {
  EuiLink,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButton,
} from '@elastic/eui';
//import { getPageData } from '../../lib/get_page_data';
import { npSetup } from 'ui/new_platform';
import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

const { cloud } = npSetup.plugins;
const isCloudEnabled = Boolean(cloud && cloud.isCloudEnabled);
let optOut = false;

const getElement = () => document.getElementById('internal-monitoring-warning');

export const destroyInternalMonitoringWarning = () => {
  const el = getElement();
  el && unmountComponentAtNode(el);
};

const callOutProps = {
  title: i18n.translate('xpack.monitoring.internalCollectionDetectedTitle', {
    defaultMessage: 'Internal Collection Detected',
  }),
  color: 'warning',
};

const description = i18n.translate('xpack.monitoring.internalMonitoringDescription', {
  defaultMessage: `It appears you are using "Internal Collection" for Stack Monitoring. 
    This method of monitoring will no longer be supported in the next major release (8.0.0). 
    Please follow "Enter setup mode" steps and migrate to external monitoring with Metricbeat.`,
});

const InternalMonitoringDetectedBanner = props => (
  <EuiCallOut {...callOutProps}>
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={true}>
        <p>
          {description}{' '}
          <EuiLink
            target="_blank"
            href={`${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}/monitoring-metricbeat-collection.html`}
          >
            Show more
          </EuiLink>
        </p>
      </EuiFlexItem>
      <EuiFlexItem
        grow={true}
        style={{ marginTop: -28, maxWidth: 30, position: 'absolute', right: 16 }}
      >
        <EuiButtonIcon
          aria-label="Opt-out of internal monitoring warning"
          color="danger"
          onClick={() => (optOut = true) && destroyInternalMonitoringWarning()}
          iconType="cross"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiButton
      onClick={() => props.toggleSetupMode(true)}
      iconType="flag"
      size="s"
      iconSide="right"
    >
      {i18n.translate('xpack.monitoring.setupMode.enter', {
        defaultMessage: 'Enter setup mode',
      })}
    </EuiButton>
  </EuiCallOut>
);

const mountComponent = toggleSetupMode => {
  const props = { toggleSetupMode };
  const el = getElement();
  el && render(<InternalMonitoringDetectedBanner {...props} />, el);
};

export const checkInternalMonitoring = async ($injector, toggleSetupMode) => {
  if (isCloudEnabled || optOut) {
    return;
  }

  // Intentionally deferring to allow initial API calls to get through first
  await setTimeout(async () => {
    const { cluster_uuid: clusterUUID } = $injector.get('globalState');
    if (!clusterUUID) {
      return;
    }

    const { getPageData } = await import('../../lib/get_page_data');
    getPageData(
      $injector,
      `../api/monitoring/v1/clusters/${clusterUUID}/elasticsearch/indices?show_system_indices=true`
    ).then(({ indices = [] }) => {
      const legacyIndices = indices.filter(
        ({ name }) =>
          name &&
          (!name.indexOf('.monitoring-') || !name.indexOf('monitoring-')) &&
          !name.includes('-mb-')
      );
      legacyIndices.length && mountComponent(toggleSetupMode);
    });
  }, 1000);
};
