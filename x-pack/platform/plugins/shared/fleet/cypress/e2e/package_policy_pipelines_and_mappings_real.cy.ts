/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_INTEGRATION_POLICY_BTN,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
  INTEGRATION_NAME_LINK,
  POLICY_EDITOR,
} from '../screens/integrations';
import { EXISTING_HOSTS_TAB } from '../screens/fleet';
import { CONFIRM_MODAL } from '../screens/navigation';
const INPUT_TEST_PACKAGE = 'input_package-1.0.0';
const INTEGRATION_TEST_PACKAGE = 'logs_integration-1.0.0';
const INTEGRATION_TEST_PACKAGE_NO_DATASET = 'logs_int_no_dataset-1.0.0';

import { API_VERSIONS } from '../../common/constants';
import { request } from '../tasks/common';
import { login } from '../tasks/login';
import { cleanupAgentPolicies } from '../tasks/cleanup';

describe('Input package create and edit package policy', () => {
  beforeEach(() => {
    login();
  });

  const agentPolicyId = 'test-input-package-policy';
  const agentPolicyName = 'Test input package policy';
  const packagePolicyName = 'input-package-policy';
  const datasetName = 'inputpkgdataset';

  function editPackagePolicyandShowAdvanced(pkg: string, pkgPolicyName: string) {
    cy.visit(`/app/integrations/detail/${pkg}/policies`);

    cy.getBySel(INTEGRATION_NAME_LINK).contains(pkgPolicyName).click();

    cy.get('button').contains('Change defaults').click();
    cy.get('[data-test-subj^="advancedStreamOptionsToggle"]').click();
  }

  before(() => {
    cy.task('installTestPackage', INPUT_TEST_PACKAGE);

    request({
      method: 'POST',
      url: `/api/fleet/agent_policies`,
      body: {
        id: agentPolicyId,
        name: agentPolicyName,
        description: 'desc',
        namespace: 'default',
        monitoring_enabled: [],
      },
      headers: { 'kbn-xsrf': 'cypress', 'Elastic-Api-Version': `${API_VERSIONS.public.v1}` },
    });
  });

  after(() => {
    cleanupAgentPolicies();
    cy.task('uninstallTestPackage', INPUT_TEST_PACKAGE);
  });

  it('should successfully create a package policy', () => {
    cy.visit(`/app/integrations/detail/${INPUT_TEST_PACKAGE}/overview`);
    cy.getBySel(ADD_INTEGRATION_POLICY_BTN).click();

    cy.getBySel(POLICY_EDITOR.POLICY_NAME_INPUT).click().clear().type(packagePolicyName);
    cy.getBySel('multiTextInput-paths')
      .find('[data-test-subj="multiTextInputRow-0"]')
      .click()
      .type('/var/log/test.log');

    cy.getBySel('multiTextInput-tags')
      .find('[data-test-subj="multiTextInputRow-0"]')
      .click()
      .type('tag1');

    cy.getBySel(POLICY_EDITOR.DATASET_SELECT).click().type(datasetName);

    cy.getBySel(EXISTING_HOSTS_TAB).click();

    cy.getBySel(POLICY_EDITOR.AGENT_POLICY_SELECT).click();
    cy.getBySel('agentPolicyMultiItem').each(($el) => {
      if ($el.text() === agentPolicyName) {
        $el.trigger('click');
      }
    });
    cy.wait(1000); // wait for policy id to be set
    cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();

    cy.getBySel(CONFIRM_MODAL.CANCEL_BUTTON).click();
  });

  it('should show pipelines editor with link to pipeline', () => {
    editPackagePolicyandShowAdvanced(INPUT_TEST_PACKAGE, packagePolicyName);
    cy.getBySel(POLICY_EDITOR.INSPECT_PIPELINES_BTN).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();
    cy.get('body').should('not.contain', 'Pipeline not found');
    cy.get('body').should('contain', '"managed_by": "fleet"');
  });
  it('should show mappings editor with link to create custom template', () => {
    editPackagePolicyandShowAdvanced(INPUT_TEST_PACKAGE, packagePolicyName);
    cy.getBySel(POLICY_EDITOR.CREATE_MAPPINGS_BTN).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();
    cy.get('body').should('contain', `Create component template`);
  });
});

describe('Integration package with custom dataset create and edit package policy', () => {
  beforeEach(() => {
    login();
  });

  const agentPolicyId = 'test-logs-integration-package-policy';
  const agentPolicyName = 'Test integration with custom dataset package policy';
  const packagePolicyName = 'logs-integration-package-policy';
  const datasetName = 'integrationpkgdataset';

  before(() => {
    cy.task('installTestPackage', INTEGRATION_TEST_PACKAGE);

    request({
      method: 'POST',
      url: `/api/fleet/agent_policies`,
      body: {
        id: agentPolicyId,
        name: agentPolicyName,
        description: 'desc',
        namespace: 'default',
        monitoring_enabled: [],
      },
      headers: { 'kbn-xsrf': 'cypress', 'Elastic-Api-Version': `${API_VERSIONS.public.v1}` },
    });
  });

  after(() => {
    cleanupAgentPolicies();
    cy.task('uninstallTestPackage', INTEGRATION_TEST_PACKAGE);
  });

  it('should successfully create a package policy', () => {
    cy.visit(`/app/integrations/detail/${INTEGRATION_TEST_PACKAGE}/overview`);
    cy.getBySel(ADD_INTEGRATION_POLICY_BTN).click();

    cy.getBySel(POLICY_EDITOR.POLICY_NAME_INPUT).click().clear().type(packagePolicyName);
    cy.getBySel('multiTextInput-log-file-path')
      .find('[data-test-subj="multiTextInputRow-0"]')
      .click()
      .type('/var/log/test.log');

    cy.getBySel('textInput-dataset-name').click().type(datasetName);

    cy.getBySel(EXISTING_HOSTS_TAB).click();

    cy.getBySel(POLICY_EDITOR.AGENT_POLICY_SELECT).click();
    cy.getBySel('agentPolicyMultiItem').each(($el) => {
      if ($el.text() === agentPolicyName) {
        $el.trigger('click');
      }
    });
    cy.wait(1000); // wait for policy id to be set
    cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();

    cy.getBySel(CONFIRM_MODAL.CANCEL_BUTTON).click();
  });

  it('should not show pipelines or mappings editor', () => {
    cy.visit(`/app/integrations/detail/${INTEGRATION_TEST_PACKAGE}/policies`);
    cy.getBySel(INTEGRATION_NAME_LINK).contains(packagePolicyName).click();
    cy.get('[data-test-subj^="advancedStreamOptionsToggle"]').click();

    cy.getBySel(POLICY_EDITOR.INSPECT_PIPELINES_BTN).should('not.exist');
    cy.getBySel(POLICY_EDITOR.EDIT_MAPPINGS_BTN).should('not.exist');
  });
});

describe('Integration package with fixed dataset create and edit package policy', () => {
  beforeEach(() => {
    login();
  });

  const agentPolicyId = 'test-integration-package-policy';
  const agentPolicyName = 'Test integration package policy';
  const packagePolicyName = 'integration-package-policy';

  before(() => {
    cy.task('installTestPackage', INTEGRATION_TEST_PACKAGE_NO_DATASET);

    request({
      method: 'POST',
      url: `/api/fleet/agent_policies`,
      body: {
        id: agentPolicyId,
        name: agentPolicyName,
        description: 'desc',
        namespace: 'default',
        monitoring_enabled: [],
      },
      headers: { 'kbn-xsrf': 'cypress', 'Elastic-Api-Version': `${API_VERSIONS.public.v1}` },
    });
  });

  after(() => {
    cleanupAgentPolicies();
    cy.task('uninstallTestPackage', INTEGRATION_TEST_PACKAGE_NO_DATASET);
  });

  it('should successfully create a package policy', () => {
    cy.visit(`/app/integrations/detail/${INTEGRATION_TEST_PACKAGE_NO_DATASET}/overview`);
    cy.getBySel(ADD_INTEGRATION_POLICY_BTN).click();

    cy.getBySel(POLICY_EDITOR.POLICY_NAME_INPUT).click().clear().type(packagePolicyName);
    cy.getBySel('multiTextInput-log-file-path')
      .find('[data-test-subj="multiTextInputRow-0"]')
      .click()
      .type('/var/log/test.log');

    cy.getBySel(EXISTING_HOSTS_TAB).click();

    cy.getBySel(POLICY_EDITOR.AGENT_POLICY_SELECT).click();
    cy.getBySel('agentPolicyMultiItem').each(($el) => {
      if ($el.text() === agentPolicyName) {
        $el.trigger('click');
      }
    });
    cy.wait(1000); // wait for policy id to be set
    cy.getBySel(CREATE_PACKAGE_POLICY_SAVE_BTN).click();

    cy.getBySel(CONFIRM_MODAL.CANCEL_BUTTON).click();
  });

  it('should show pipelines editor with link to pipeline', () => {
    cy.visit(`/app/integrations/detail/${INTEGRATION_TEST_PACKAGE_NO_DATASET}/policies`);
    cy.getBySel(INTEGRATION_NAME_LINK).contains(packagePolicyName).click();
    cy.get('[data-test-subj^="advancedStreamOptionsToggle"]').click();

    cy.getBySel(POLICY_EDITOR.INSPECT_PIPELINES_BTN).click();
    cy.get('body').should('not.contain', 'Pipeline not found');
    cy.get('body').should('contain', '"managed_by": "fleet"');
  });
  it('should show mappings editor with link to create custom template', () => {
    cy.visit(`/app/integrations/detail/${INTEGRATION_TEST_PACKAGE_NO_DATASET}/policies`);
    cy.getBySel(INTEGRATION_NAME_LINK).contains(packagePolicyName).click();
    cy.get('[data-test-subj^="advancedStreamOptionsToggle"]').click();

    cy.getBySel(POLICY_EDITOR.CREATE_MAPPINGS_BTN).click();
    cy.get('body').should('contain', `Create component template`);
  });
});
