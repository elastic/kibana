/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';

import { INTEGRATIONS, navigateTo } from '../tasks/navigation';
import {
  addIntegration,
  installPackageWithVersion,
  deleteIntegrations,
  clickIfVisible,
  calculateAssetCount,
} from '../tasks/integrations';
import {
  AGENT_POLICY_NAME_LINK,
  FLYOUT_CLOSE_BTN_SEL,
  getIntegrationCard,
  INSTALLED_INTEGRATIONS_DASHBOARDS_LINK,
  INSTALLED_INTEGRATIONS_TABLE_ROW,
  INTEGRATION_NAME_LINK,
  LATEST_VERSION,
  PACKAGE_VERSION,
  POLICIES_TAB,
  SETTINGS_TAB,
  UPDATE_PACKAGE_BTN,
  INTEGRATIONS_SEARCHBAR,
  SETTINGS,
  INTEGRATION_POLICIES_UPGRADE_CHECKBOX,
  INTEGRATION_LIST,
  getIntegrationCategories,
  ADD_INTEGRATION_FLYOUT,
  BREAKING_CHANGE_CHECKBOX_SEL,
} from '../screens/integrations';
import { LOADING_SPINNER, CONFIRM_MODAL } from '../screens/navigation';
import { ADD_PACKAGE_POLICY_BTN } from '../screens/fleet';
import { cleanupAgentPolicies } from '../tasks/cleanup';
import { request, visit } from '../tasks/common';
import { login } from '../tasks/login';

function setupIntegrations() {
  cy.intercept(
    '/api/fleet/epm/packages?*',
    {
      middleware: true,
    },
    (req) => {
      req.on('before:response', (res) => {
        // force all API responses to not be cached
        res.headers['cache-control'] = 'no-store';
      });
    }
  ).as('packages');

  navigateTo(INTEGRATIONS);
  cy.wait('@packages');
}

// Infinite scroll
function getAllIntegrations() {
  const cardItems = new Set<string>();

  for (let i = 0; i < 10; i++) {
    cy.window().then((win) => {
      const scrollContainer = win.document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID);

      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      } else {
        cy.scrollTo(0, i * 600);
      }
    });

    cy.wait(50);
    cy.getBySel(INTEGRATION_LIST)
      .find('.euiCard')
      .should('be.visible')
      .each((element) => {
        const attrValue = element.attr('data-test-subj');
        if (attrValue) {
          cardItems.add(attrValue);
        }
      });
  }

  return cy.then(() => {
    return [...cardItems.values()];
  });
}

describe('Add Integration - Real API', () => {
  const integration = 'apache';

  beforeEach(() => {
    login();

    cleanupAgentPolicies();
    deleteIntegrations();
  });

  afterEach(() => {});

  it('should install integration without policy', () => {
    // Intercept the package info API to get the asset count
    cy.intercept('GET', '**/api/fleet/epm/packages/tomcat**').as('getPackageInfo');
    cy.visit('/app/integrations/detail/tomcat/settings');

    cy.wait('@getPackageInfo').then((interception) => {
      const packageInfo = interception.response?.body.item;
      const assetCount = calculateAssetCount(packageInfo);

      cy.getBySel(SETTINGS.INSTALL_ASSETS_BTN).click();
      // Assert against the actual asset count from the package
      cy.get('.euiCallOut').contains(
        `This action will install ${assetCount} asset${assetCount === 1 ? '' : 's'}`
      );
      cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

      cy.getBySel(LOADING_SPINNER).should('not.exist');

      cy.getBySel(SETTINGS.UNINSTALL_ASSETS_BTN).click();
      cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();
      cy.getBySel(LOADING_SPINNER).should('not.exist');
      cy.getBySel(SETTINGS.INSTALL_ASSETS_BTN).should('exist');
    });
  });

  it('should display Apache integration in the Policies list once installed ', () => {
    setupIntegrations();
    cy.getBySel(LOADING_SPINNER).should('not.exist');
    cy.getBySel(INTEGRATIONS_SEARCHBAR.INPUT).clear().type('Apache');
    cy.getBySel(getIntegrationCard(integration)).click();
    addIntegration();
    cy.getBySel(INTEGRATION_NAME_LINK).contains('apache-1');
    cy.getBySel(AGENT_POLICY_NAME_LINK).contains('Agent policy 1');
  });

  it('should add integration to policy', () => {
    const agentPolicyId = 'policy_1';
    request({
      method: 'POST',
      url: `/api/fleet/agent_policies`,
      body: {
        id: `${agentPolicyId}`,
        name: 'Agent policy 1',
        description: 'desc',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
      },
    });

    request({ url: '/api/fleet/agent_policies' }).then((response: any) => {
      visit(`/app/fleet/policies/${agentPolicyId}`);

      cy.intercept(
        '/api/fleet/epm/packages?*',
        {
          middleware: true,
        },
        (req) => {
          req.on('before:response', (res) => {
            // force all API responses to not be cached
            res.headers['cache-control'] = 'no-store';
          });
        }
      ).as('packages');
      cy.intercept('/api/fleet/epm/packages/1password/*').as('1passwordPackage');

      cy.getBySel(ADD_PACKAGE_POLICY_BTN).click();
      cy.wait('@packages');
      const packageComboBox = cy.getBySel(ADD_INTEGRATION_FLYOUT.SELECT_INTEGRATION_COMBOBOX);
      packageComboBox.click();
      cy.wait('@1passwordPackage');
      cy.wait(100);
      cy.get('[title="1Password"]').click();
      cy.getBySel(ADD_INTEGRATION_FLYOUT.PASSWORD_INPUT).type('test');
      cy.getBySel(ADD_INTEGRATION_FLYOUT.SUBMIT_BTN).click();
      cy.get('.euiBasicTable-loading').should('not.exist');
      cy.get('.euiLink').contains('1password-1');
    });
  });

  it('should upgrade policies with integration update', () => {
    const oldVersion = '0.3.3';
    cy.intercept('GET', '**/api/fleet/epm/packages/apache/*/changelog.yml').as('getChangelog');
    installPackageWithVersion('apache', oldVersion);
    navigateTo(`app/integrations/detail/apache-${oldVersion}/policies`);

    addIntegration();

    cy.getBySel(INTEGRATION_NAME_LINK).contains('apache-');
    cy.getBySel(PACKAGE_VERSION).contains(oldVersion);

    clickIfVisible(FLYOUT_CLOSE_BTN_SEL);

    cy.getBySel(SETTINGS_TAB).click();
    cy.getBySel(INTEGRATION_POLICIES_UPGRADE_CHECKBOX);
    clickIfVisible(BREAKING_CHANGE_CHECKBOX_SEL);
    cy.getBySel(UPDATE_PACKAGE_BTN).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

    cy.getBySel(LATEST_VERSION).then(($title) => {
      const newVersion = $title.text();
      cy.getBySel(INTEGRATION_POLICIES_UPGRADE_CHECKBOX).should('not.exist');
      cy.getBySel(POLICIES_TAB).click();
      cy.getBySel(PACKAGE_VERSION).contains(oldVersion).should('not.exist');
      cy.getBySel(PACKAGE_VERSION).contains(newVersion);
    });
  });
});

describe('It should handle non existing package', () => {
  beforeEach(() => {
    login();
  });
  it('should display error when visiting a non existing package details page', () => {
    cy.visit('/app/integrations/detail/packagedonotexists');

    cy.contains('[packagedonotexists] package not installed or found in registry').should('exist');
  });
});

describe('Browsing integrations - Real API', () => {
  const viewPortDimensions = [
    [1200, 800],
    [375, 667],
  ];

  viewPortDimensions.forEach((dimensions) => {
    describe(`Viewport: ${dimensions[0]}x${dimensions[1]}`, () => {
      beforeEach(() => {
        cy.viewport(dimensions[0], dimensions[1]);
        login();
      });

      it('should display a list of integrations', () => {
        setupIntegrations();

        // Wait for loading to complete
        cy.getBySel(LOADING_SPINNER).should('not.exist');

        // Verify that integrations are displayed
        cy.getBySel(INTEGRATION_LIST).should('be.visible');
        getAllIntegrations().should('have.length.greaterThan', 50);
      });

      it('should filter integrations by category', () => {
        setupIntegrations();
        cy.getBySel(getIntegrationCategories('aws')).click({ scrollBehavior: false });

        cy.getBySel(INTEGRATIONS_SEARCHBAR.BADGE).contains('AWS').should('exist');

        getAllIntegrations().then((items) => {
          expect(items).to.have.length.greaterThan(29);
        });

        cy.getBySel(INTEGRATIONS_SEARCHBAR.INPUT).clear().type('Cloud');
        getAllIntegrations().then((items) => {
          expect(items).to.have.length.greaterThan(3);
        });

        cy.getBySel(INTEGRATIONS_SEARCHBAR.REMOVE_BADGE_BUTTON).click();
        cy.getBySel(INTEGRATIONS_SEARCHBAR.BADGE).should('not.exist');
      });

      it('should filter integrations by search term', () => {
        setupIntegrations();

        cy.getBySel(INTEGRATIONS_SEARCHBAR.INPUT).clear().type('1Password');
        cy.getBySel(getIntegrationCard('1password')).should('be.visible');
      });
    });
  });
});

// Enable when we are ready to provide more testing for the tabular view of installed integrations.
describe.skip('Dashboards link for installed integration - Real API', () => {
  const integration = 'apache';
  const expectedIntegrationDashboard = '[Metrics Apache] Overview';
  const unexpectedIntegrationDashboard = '[Elastic Agent]';
  beforeEach(() => {
    login();
  });

  it('should navigate to the dashboards list filtered by the integration name', () => {
    setupIntegrations();
    cy.getBySel(LOADING_SPINNER).should('not.exist');
    cy.getBySel(INTEGRATIONS_SEARCHBAR.INPUT).clear().type('Apache');
    cy.getBySel(getIntegrationCard(integration)).click();
    addIntegration();
    cy.visit('/app/integrations/installed');
    cy.getBySel(INSTALLED_INTEGRATIONS_TABLE_ROW)
      .contains('Apache')
      .parents('tr')
      .find(`[data-test-subj="${INSTALLED_INTEGRATIONS_DASHBOARDS_LINK}"]`)
      .click();
    cy.contains(expectedIntegrationDashboard).should('exist');
    cy.contains(unexpectedIntegrationDashboard).should('not.exist');
  });
});
