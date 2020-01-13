/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
  This is a temporary deprecation warning that will be valid for the span of 7.6.0 - 8.0.0
  Context: https://github.com/elastic/stack-monitoring-dev/issues/76
*/

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { getPageData } from '../../lib/get_page_data';
import { npSetup } from 'ui/new_platform';
import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

const { cloud } = npSetup.plugins;
const isCloudEnabled = Boolean(cloud && cloud.isCloudEnabled);
let checked = false;
let isLegacy = false;
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
    Please follow "Enter setup mode" steps and migrate to external monitoring with Metricbeat`,
});

const InternalMonitoringDetectedBanner = () => (
  <EuiCallOut {...callOutProps}>
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <p>
          {description}{' '}
          <EuiLink
            target="_blank"
            href={`${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}/monitoring-metricbeat-collection.html`}
          >
            more info
          </EuiLink>
          .
        </p>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          color="danger"
          onClick={() => (optOut = true) && destroyInternalMonitoringWarning()}
          iconType="cross"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCallOut>
);

const mountComponent = () => {
  if (isLegacy) {
    const el = getElement();
    el && render(<InternalMonitoringDetectedBanner />, el);
  }
};

export const checkInternalMonitoring = $injector => {
  if (isCloudEnabled || optOut) {
    return;
  }

  if (checked) {
    mountComponent();
    return;
  }

  checked = true;

  // Intentionally deferring to allow initial API calls to get through first
  setTimeout(() => {
    const { cluster_uuid: clusterUUID } = $injector.get('globalState');

    if (!clusterUUID) {
      checked = false;
      return;
    }

    getPageData(
      $injector,
      `../api/monitoring/v1/clusters/${clusterUUID}/elasticsearch/indices?show_system_indices=true`
    ).then(({ indices = [] }) => {
      isLegacy = Boolean(
        indices.map(({ name }) => name && !name.indexOf('.monitoring-') && !name.includes('-mb-'))
          .length
      );
      mountComponent();
    });
  }, 1000);
};
