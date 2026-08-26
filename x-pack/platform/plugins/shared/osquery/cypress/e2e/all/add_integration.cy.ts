/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIVE_QUERY_EDITOR } from '../../screens/live_query';
import {
  ADD_PACK_HEADER_BUTTON,
  ADD_QUERY_BUTTON,
  FLYOUT_SAVED_QUERY_SAVE_BUTTON,
  formFieldInputSelector,
  SAVE_PACK_BUTTON,
  SAVED_QUERY_DROPDOWN_SELECT,
  TABLE_ROWS,
} from '../../screens/packs';
import {
  cleanupPack,
  cleanupAgentPolicy,
  cleanupSavedQuery,
  loadSavedQuery,
  savedQueryFixture,
} from '../../tasks/api_fixtures';
import {
  createOldOsqueryPath,
  FLEET_AGENT_POLICIES,
  NAV_SEARCH_INPUT_OSQUERY_RESULTS,
  navigateTo,
  OSQUERY,
} from '../../tasks/navigation';
import {
  addCustomIntegration,
  closeFleetTourIfVisible,
  closeModalIfVisible,
  generateRandomStringName,
  integrationExistsWithinPolicyDetails,
  installPackageWithVersion,
  interceptPackId,
  interceptAgentPolicyId,
  policyContainsIntegration,
  checkDataStreamsInPolicyDetails,
} from '../../tasks/integrations';
import { ServerlessRoleName } from '../../support/roles';

describe.skip('ALL - Add Integration', { tags: ['@ess', '@serverless'] }, () => {
  let savedQueryId: string;

  before(() => {
    loadSavedQuery().then((data) => {
      savedQueryId = data.saved_object_id;
    });
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.PLATFORM_ENGINEER);
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
  });

  it(
    'validate osquery is not available and nav search links to integration',
    { tags: ['@ess', '@brokenInServerless'] },
    () => {
      cy.visit(OSQUERY);
      cy.intercept('GET', '**/internal/osquery/status', (req) => {
        req.continue((res) => res.send({ ...res.body, install_status: undefined }));
      });
      cy.contains('Add this integration to run and schedule queries for Elastic Agent.');
      cy.contains('Add Osquery Manager');
      cy.getBySel('osquery-add-integration-button');
      cy.getBySel('nav-search-input').type('Osquery');
      cy.get(`[url="${NAV_SEARCH_INPUT_OSQUERY_RESULTS.MANAGEMENT}"]`).should('exist');
      cy.get(`[url="${NAV_SEARCH_INPUT_OSQUERY_RESULTS.LOGS}"]`).should('exist');
      cy.get(`[url="${NAV_SEARCH_INPUT_OSQUERY_RESULTS.MANAGER}"]`).should('exist').click();
    }
  );

  // Failing: See https://github.com/elastic/kibana/issues/255381
  describe.skip('Add and upgrade integration', { tags: ['@ess', '@serverless'] }, () => {
    const oldVersion = '0.7.4';
    const [integrationName, policyName] = generateRandomStringName(2);
    let policyId: string;

    beforeEach(() => {
      // PR #266513 disables Add integration when viewed package version differs from installed.
      // FTR config auto-installs latest osquery_manager; force the old version so the button stays enabled.
      installPackageWithVersion('osquery_manager', oldVersion);

      interceptAgentPolicyId((agentPolicyId) => {
        policyId = agentPolicyId;
      });
    });

    afterEach(() => {
      cleanupAgentPolicy(policyId);
    });

    it('should add the old integration and be able to upgrade it', { tags: '@ess' }, () => {
      navigateTo(createOldOsqueryPath(oldVersion));
      addCustomIntegration(integrationName, policyName);
      policyContainsIntegration(integrationName, policyName);
      checkDataStreamsInPolicyDetails();
      cy.contains(`version: ${oldVersion}`);
      cy.getBySel('euiFlyoutCloseButton').click();
      cy.getBySel('integrationPolicyUpgradeBtn').click();
      cy.getBySel('saveIntegration').click();
      cy.contains(`Successfully updated '${integrationName}'`);
      policyContainsIntegration(integrationName, policyName);
      cy.contains(`version: ${oldVersion}`).should('not.exist');
    });
  });
  // Failing: See https://github.com/elastic/kibana/issues/255381
  describe.skip('Add integration to policy', () => {
    const [integrationName, policyName] = generateRandomStringName(2);
    let policyId: string;
    beforeEach(() => {
      interceptAgentPolicyId((agentPolicyId) => {
        policyId = agentPolicyId;
      });
    });

    afterEach(() => {
      cleanupAgentPolicy(policyId);
    });

    it(
      'add integration',
      { tags: ['@ess', '@brokenInServerless'] },

      () => {
        cy.visit(FLEET_AGENT_POLICIES);
        closeFleetTourIfVisible();
        cy.getBySel('createAgentPolicyButton').click();
        cy.getBySel('createAgentPolicyNameField').type(policyName);
        cy.getBySel('createAgentPolicyFlyoutBtn').click();
        closeFleetTourIfVisible();
        cy.getBySel('agentPolicyNameLink').contains(policyName).click();
        closeFleetTourIfVisible();
        cy.getBySel('addPackagePolicyButton').click();
        cy.getBySel('addIntegrationFlyout').should('exist');
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        cy.getBySel('comboBoxInput').type('osquery manager{downArrow}{enter}');
        cy.get('body').then(($body) => {
          if ($body.find('[role="option"]').length > 0) {
            cy.get('[role="option"]').first().click();
          }
        });

        cy.getBySel('packagePolicyNameInput').clear();
        cy.getBySel('packagePolicyNameInput').should('have.value', '');
        cy.getBySel('packagePolicyNameInput').type(`${integrationName}`);
        cy.getBySel('addIntegrationFlyout.submitBtn').should('be.enabled').click();
        cy.get(`[title="${integrationName}"]`, { timeout: 60000 }).should('exist');
        policyContainsIntegration(integrationName, policyName);
        checkDataStreamsInPolicyDetails();
        cy.visit(OSQUERY);
        cy.contains('History');
      }
    );
  });

  describe('Upgrade policy with existing packs', () => {
    const oldVersion = '1.2.0';
    const [policyName, integrationName, packName] = generateRandomStringName(3);
    let policyId: string;
    let packId: string;

    beforeEach(() => {
      // PR #266513 disables Add integration when viewed package version differs from installed.
      // FTR config auto-installs latest osquery_manager; force the old version so the button stays enabled.
      installPackageWithVersion('osquery_manager', oldVersion);

      interceptAgentPolicyId((agentPolicyId) => {
        policyId = agentPolicyId;
      });
      interceptPackId((pack) => {
        packId = pack;
      });
    });

    afterEach(() => {
      cleanupPack(packId);
      cleanupAgentPolicy(policyId);
    });

    it('should have integration and packs copied when upgrading integration', () => {
      cy.visit(`app/integrations/detail/osquery_manager-${oldVersion}/overview`);
      addCustomIntegration(integrationName, policyName);
      cy.getBySel('integrationPolicyUpgradeBtn');
      cy.get(`[title="${policyName}"]`).click();
      closeFleetTourIfVisible();
      cy.get(`[title="${integrationName}"]`)
        .parents('tr')
        .within(() => {
          cy.contains('Osquery Manager');
          cy.getBySel('integrationPolicyUpgradeBtn');
          cy.contains(`v${oldVersion}`);
          cy.getBySel('agentActionsBtn').click();
        });
      integrationExistsWithinPolicyDetails(integrationName);
      checkDataStreamsInPolicyDetails();
      cy.contains(`version: ${oldVersion}`);
      cy.getBySel('euiFlyoutCloseButton').click();

      navigateTo('app/osquery/packs');
      cy.getBySel(ADD_PACK_HEADER_BUTTON).click();
      cy.getBySel('globalLoadingIndicator').should('not.exist');

      cy.get(formFieldInputSelector('name')).type(`${packName}{downArrow}{enter}`);
      cy.getBySel('policyIdsComboBox').type(`${policyName} {downArrow}{enter}`);

      cy.getBySel(ADD_QUERY_BUTTON).click();
      cy.getBySel('globalLoadingIndicator').should('not.exist');
      cy.getBySel(LIVE_QUERY_EDITOR).should('exist');
      // `useSavedQueries` resolves independently of LIVE_QUERY_EDITOR; wait for
      // the fixture option to render before selecting so {enter} can't no-op on
      // a slow MKI fetch and leave the flyout open over `save-pack-button`.
      cy.getBySel(SAVED_QUERY_DROPDOWN_SELECT).click();
      cy.contains('[role="option"]', savedQueryFixture.id).click();
      cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();
      cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).should('not.exist');
      cy.getBySel(SAVE_PACK_BUTTON).click();
      cy.contains(`Successfully created "${packName}" pack`).click();
      cy.visit('app/fleet/policies');
      closeFleetTourIfVisible();
      cy.get(`[title="${policyName}"]`).click();
      closeFleetTourIfVisible();
      cy.getBySel('integrationPolicyUpgradeBtn').click();
      cy.contains(/^Osquery config$/).click();
      cy.get('.kibanaCodeEditor', { timeout: 30000 }).should('contain', `"default--${packName}":`);
      cy.getBySel('saveIntegration').click();
      cy.get(`a[title="${integrationName}"]`).click();
      cy.contains(/^Osquery config$/).click();
      cy.get('.kibanaCodeEditor', { timeout: 30000 }).should('contain', `"default--${packName}":`);
      cy.contains('Cancel').click();
      closeModalIfVisible();
      cy.get(`[title="${integrationName}"]`)
        .parents('tr')
        .within(() => {
          cy.getBySel('integrationPolicyUpgradeBtn').should('not.exist');
          cy.contains('Osquery Manager').and('not.contain', `v${oldVersion}`);
        });
      integrationExistsWithinPolicyDetails(integrationName);
      checkDataStreamsInPolicyDetails();
      // test list of prebuilt queries
      navigateTo('/app/osquery/saved_queries');
      cy.get(TABLE_ROWS).should('have.length.above', 5);
    });
  });
});
