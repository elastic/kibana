/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_INTEGRATION_POLICY_BTN,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
  FLYOUT_CLOSE_BTN_SEL,
  INTEGRATION_LIST,
} from '../screens/integrations';

import { AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX, EXISTING_HOSTS_TAB } from '../screens/fleet';
import { CONFIRM_MODAL } from '../screens/navigation';

import { request } from './common';

export const addIntegration = ({ useExistingPolicy } = { useExistingPolicy: false }) => {
  cy.intercept('/api/fleet/agent_status?*').as('agentStatus');

  cy.getBySel(ADD_INTEGRATION_POLICY_BTN).click();
  if (useExistingPolicy) {
    cy.getBySel(EXISTING_HOSTS_TAB).click();
    cy.wait('@agentStatus');
  } else {
    // speeding up creating with unchecking system integration
    cy.getBySel(AGENT_POLICY_SYSTEM_MONITORING_CHECKBOX).uncheck({ force: true });
  }
  cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).should('be.enabled').click();

  // sometimes agent is assigned to default policy, sometimes not
  cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

  cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).should('not.exist');
  clickIfVisible(FLYOUT_CLOSE_BTN_SEL);
};

export function clickIfVisible(selector: string) {
  cy.get('body').then(($body) => {
    if ($body.find(selector).length) {
      cy.get(selector).click();
    }
  });
}

export const deleteIntegrations = () => {
  request({ url: '/api/fleet/package_policies' })
    .then((packagePoliciesResponse: any) => {
      const packagePolicyIds = packagePoliciesResponse.body.items.map((policy: any) => policy.id);

      request({
        url: `/api/fleet/package_policies/delete`,
        body: `{ "packagePolicyIds": ${JSON.stringify(packagePolicyIds)}, "force": true }`,
        method: 'POST',
      });
    })
    .then(() => {
      request({ url: '/api/fleet/epm/packages' }).then((packagesResponse: any) => {
        for (const pkg of packagesResponse.body.items.filter(
          (item: any) => item.status === 'installed'
        )) {
          request({
            url: `/api/fleet/epm/packages/${pkg.name}/${pkg.version}`,
            method: 'DELETE',
            body: {
              force: true,
            },
          });
        }
      });
    });
};

export const installPackageWithVersion = (integration: string, version: string) => {
  request({
    url: `/api/fleet/epm/packages/${integration}/${version}`,
    body: '{ "force": true }',
    method: 'POST',
  });
};

export function scrollToIntegration(selector: string) {
  cy.getBySel(INTEGRATION_LIST);

  return cy.window().then(async (win) => {
    let found = false;
    let i = 0;
    while (!found && i < 20) {
      win.scroll(0, i++ * 250);
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (win.document.querySelector(`[data-test-subj="${selector}"]`)) {
        found = true;
      }
    }
  });
}
