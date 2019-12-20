/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { routeToHome, routeToConnectors, routeToAlerts } from '../constants';

export const getCurrentBreadcrumb = (type: string): any => {
  // Home and sections
  switch (type) {
    case 'home':
      return {
        text: i18n.translate('xpack.triggersActionsUI.home.breadcrumbTitle', {
          defaultMessage: 'Alerts and Actions',
        }),
        href: `#${routeToHome}`,
      };
    case 'connectors':
      return {
        text: i18n.translate('xpack.triggersActionsUI.connectors.breadcrumbTitle', {
          defaultMessage: 'Connectors',
        }),
        href: `#${routeToConnectors}`,
      };
    case 'alerts':
      return {
        text: i18n.translate('xpack.triggersActionsUI.alerts.breadcrumbTitle', {
          defaultMessage: 'Alerts',
        }),
        href: `#${routeToAlerts}`,
      };
  }
};
