/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertingSectionBreadcrumb } from './breadcrumb';
import { i18n } from '@kbn/i18n';
import { routeToConnectors, routeToRules, routeToHome } from '../constants';

describe('getAlertingSectionBreadcrumb', () => {
  test('if change calls return proper breadcrumb title ', async () => {
    expect(getAlertingSectionBreadcrumb('connectors', true)).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.connectors.breadcrumbTitle', {
        defaultMessage: 'Connectors',
      }),
      href: `${routeToConnectors}`,
    });
    expect(getAlertingSectionBreadcrumb('rules', true)).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.rules.breadcrumbTitle', {
        defaultMessage: 'Rules',
      }),
      href: `${routeToRules}`,
    });
    expect(getAlertingSectionBreadcrumb('home', true)).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.home.breadcrumbTitle', {
        defaultMessage: 'Rules',
      }),
      href: `${routeToHome}`,
    });
  });
  test('if boolean is passed in returns proper breadcrumb href ', async () => {
    expect(getAlertingSectionBreadcrumb('connectors', true)).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.connectors.breadcrumbTitle', {
        defaultMessage: 'Connectors',
      }),
      href: `${routeToConnectors}`,
    });
    expect(getAlertingSectionBreadcrumb('rules', false)).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.rules.breadcrumbTitle', {
        defaultMessage: 'Rules',
      }),
    });
    expect(getAlertingSectionBreadcrumb('home', false)).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.home.breadcrumbTitle', {
        defaultMessage: 'Rules',
      }),
    });
  });
});
