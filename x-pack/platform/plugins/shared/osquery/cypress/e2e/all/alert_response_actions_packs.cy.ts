/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeDataViews } from '../../tasks/login';
import { ServerlessRoleName } from '../../support/roles';
import {
  cleanupPack,
  cleanupRule,
  loadPack,
  loadRule,
  multiQueryPackFixture,
  packFixture,
} from '../../tasks/api_fixtures';
import {
  OSQUERY_RESPONSE_ACTION_ADD_BUTTON,
  RESPONSE_ACTIONS_ITEM_0,
} from '../../tasks/response_actions';
import { closeDateTabIfVisible, closeToastIfVisible } from '../../tasks/integrations';

describe(
  'Alert Response Actions',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    // Pack response actions are the E2E-unique surface: the UI pack selection must
    // serialize into `response_actions[0].params.queries` via the rule-save HTTP
    // round-trip, and a pack swap must replace the full query set.
    //
    // Pure form validation (required fields, timeout min/max, ID uniqueness, ECS mapping
    // pairing) and inline-custom-query persistence are Jest-covered:
    //   - public/form/validations.test.ts
    //   - public/packs/queries/validations.test.ts
    //   - public/packs/queries/ecs_mapping_editor_field.test.ts
    // so this test sticks to the pack path only.
    describe('Pack response action persistence', () => {
      let multiQueryPackId: string;
      let multiQueryPackName: string;
      let ruleId: string;
      let ruleName: string;
      let packId: string;
      let packName: string;
      const packData = packFixture();
      const multiQueryPackData = multiQueryPackFixture();

      before(() => {
        initializeDataViews();
        loadPack(packData).then((data) => {
          packId = data.saved_object_id;
          packName = data.name;
        });
        loadPack(multiQueryPackData).then((data) => {
          multiQueryPackId = data.saved_object_id;
          multiQueryPackName = data.name;
        });
      });

      // The test saves response actions onto the rule, so every attempt needs a
      // pristine rule. Creating it in `before` made a Cypress retry start from a
      // rule that already had the pack response action attached: the retry then
      // added a *second*, empty Osquery response action, the actions step failed
      // validation ("Query is a required field") and the rule save was never
      // issued at all.
      beforeEach(() => {
        loadRule().then((data) => {
          ruleId = data.id;
          ruleName = data.name;
        });
      });

      afterEach(() => {
        cleanupRule(ruleId);
      });

      after(() => {
        cleanupPack(packId);
        cleanupPack(multiQueryPackId);
      });

      const openRuleActionsTab = () => {
        cy.visit(`/app/security/rules/id/${ruleId}/edit`);
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        closeDateTabIfVisible();
        cy.getBySel('edit-rule-actions-tab').click();
        cy.getBySel('globalLoadingIndicator').should('not.exist');
      };

      it('persists pack response actions across save/reopen and handles pack swap', () => {
        cy.login(ServerlessRoleName.SOC_MANAGER, false);
        openRuleActionsTab();
        cy.contains('Response actions are run on each rule execution.');

        // Add a single-query pack as a response action.
        cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.contains('Run a set of queries in a pack').click();
          cy.getBySel('comboBoxInput').click().type(`${packName}{downArrow}{enter}`);
        });

        cy.intercept('PUT', '/api/detection_engine/rules').as('saveRuleSingleQuery');
        cy.getBySel('ruleEditSubmitButton').click();
        cy.wait('@saveRuleSingleQuery', { timeout: 15000 }).should(({ request }) => {
          const { queries } = request.body.response_actions[0].params;
          // `deep.include` rather than `deep.equal`: pack queries also carry a
          // server-generated `schedule_id` that the pack read API returns and the
          // response action form passes straight through. It is opaque to the
          // test, so assert the fields the UI is responsible for serializing.
          expect(queries).to.have.length(1);
          expect(queries[0]).to.deep.include({
            interval: 3600,
            query: 'select * from uptime;',
            id: Object.keys(packData.queries)[0],
          });
        });
        cy.contains(`${ruleName} was saved`).should('exist');
        closeToastIfVisible();

        // Reopen — pack selection must survive the round-trip.
        openRuleActionsTab();
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.getBySel('comboBoxSearchInput').should('have.value', packName);
        });

        // Swap to the multi-query pack — save expands queries to 3.
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0)
          .within(() => {
            cy.getBySel('comboBoxInput').type(
              `{selectall}{backspace}${multiQueryPackName}{downArrow}{enter}`
            );
            cy.contains('SELECT * FROM memory_info;');
            cy.contains('SELECT * FROM system_info;');
          })
          .clickOutside();

        cy.intercept('PUT', '/api/detection_engine/rules').as('saveRuleMultiQuery');
        cy.contains('Save changes').click();
        cy.wait('@saveRuleMultiQuery', { timeout: 15000 }).should(({ request }) => {
          const { queries } = request.body.response_actions[0].params;
          expect(queries).to.have.length(3);
          expect(queries[0]).to.deep.include({
            interval: 3600,
            query: 'SELECT * FROM memory_info;',
            platform: 'linux',
            id: Object.keys(multiQueryPackData.queries)[0],
          });
          expect(queries[1]).to.deep.include({
            interval: 3600,
            query: 'SELECT * FROM system_info;',
            id: Object.keys(multiQueryPackData.queries)[1],
          });
          expect(queries[2]).to.deep.include({
            interval: 10,
            query: 'select opera_extensions.* from users join opera_extensions using (uid);',
            id: Object.keys(multiQueryPackData.queries)[2],
          });
        });
      });
    });
  }
);
