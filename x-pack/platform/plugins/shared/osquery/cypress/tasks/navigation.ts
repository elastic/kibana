/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOGGLE_NAVIGATION_BTN } from '../screens/navigation';
import { closeToastIfVisible } from './integrations';

export const INTEGRATIONS = 'app/integrations#/';
export const FLEET = 'app/fleet/';
export const FLEET_AGENT_POLICIES = 'app/fleet/policies';
export const OSQUERY = 'app/osquery';
export const NEW_LIVE_QUERY = 'app/osquery/live_queries/new';
export const OSQUERY_INTEGRATION_PAGE = '/app/fleet/integrations/osquery_manager/add-integration';
export const navigateTo = (page: string, opts?: Partial<Cypress.VisitOptions>) => {
  cy.visit(page, opts);
  cy.contains('Loading Elastic').should('exist');
  cy.contains('Loading Elastic').should('not.exist');

  // There's a security warning toast that seemingly makes ui elements in the bottom right unavailable, so we close it
  closeToastIfVisible();
};

export const openNavigationFlyout = () => {
  cy.get(TOGGLE_NAVIGATION_BTN).click();
};

export const createOldOsqueryPath = (version: string) =>
  `app/integrations/detail/osquery_manager-${version}/settings`;

export enum NAV_SEARCH_INPUT_OSQUERY_RESULTS {
  MANAGEMENT = '/app/osquery',
  LOGS = '/app/integrations/detail/osquery/overview',
  MANAGER = '/app/integrations/detail/osquery_manager/overview',
}

/**
 * Local storage keys we use to store the state of our new features tours we currently show in the app.
 *
 * NOTE: As soon as we want to show tours for new features in the upcoming release,
 * we will need to update these constants with the corresponding version.
 */
export const NEW_FEATURES_TOUR_STORAGE_KEYS = {
  RULE_MANAGEMENT_PAGE: 'securitySolution.rulesManagementPage.newFeaturesTour.v8.13',
  TIMELINES: 'securitySolution.security.timelineFlyoutHeader.saveTimelineTour',
  KNOWLEDGE_BASE: 'elasticAssistant.knowledgeBase.newFeaturesTour.v8.16',
};

/**
 * For all the new features tours we show in the app, this method disables them
 * by setting their configs in the local storage. It prevents the tours from appearing
 * on the page during test runs and covering other UI elements.
 * @param window - browser's window object
 */
export const disableNewFeaturesTours = (window: Window) => {
  const tourStorageKeys = Object.values(NEW_FEATURES_TOUR_STORAGE_KEYS);
  const tourConfig = {
    isTourActive: false,
  };

  tourStorageKeys.forEach((key) => {
    window.localStorage.setItem(key, JSON.stringify(tourConfig));
  });
};
