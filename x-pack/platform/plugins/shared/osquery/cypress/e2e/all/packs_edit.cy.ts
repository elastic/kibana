/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { API_VERSIONS } from '@kbn/osquery-plugin/common/constants';
import {
  ADD_QUERY_BUTTON,
  FLYOUT_SAVED_QUERY_SAVE_BUTTON,
  customActionEditSavedQuerySelector,
  EDIT_PACK_HEADER_BUTTON,
  SAVED_QUERY_DROPDOWN_SELECT,
  UPDATE_PACK_BUTTON,
  TABLE_ROWS,
  formFieldInputSelector,
  FLYOUT_SAVED_QUERY_CANCEL_BUTTON,
} from '../../screens/packs';
import { navigateTo } from '../../tasks/navigation';
import { deleteAndConfirm, inputQuery } from '../../tasks/live_query';
import { changePackActiveStatus, preparePack } from '../../tasks/packs';
import { closeModalIfVisible, closeToastIfVisible } from '../../tasks/integrations';
import { generateRandomStringName } from '../../tasks/integrations';
import { LIVE_QUERY_EDITOR } from '../../screens/live_query';
import { loadSavedQuery, cleanupSavedQuery, cleanupPack, loadPack } from '../../tasks/api_fixtures';
import { request } from '../../tasks/common';
import { ServerlessRoleName } from '../../support/roles';

/** Helper to fetch the first package policy's policy_ids */
const getFirstPolicyIds = () =>
  request<{ items: PackagePolicy[] }>({
    url: '/internal/osquery/fleet_wrapper/package_policies',
    headers: {
      'Elastic-Api-Version': API_VERSIONS.internal.v1,
    },
  }).then((response) => response.body.items[0].policy_ids);

/** Helper to create a standard test pack with a single saved query */
const createStandardPack = (savedQueryName: string) =>
  getFirstPolicyIds().then((policyIds) =>
    loadPack({
      policy_ids: policyIds,
      queries: {
        [savedQueryName]: {
          ecs_mapping: {},
          interval: 60,
          query: 'select * from uptime;',
        },
      },
    })
  );

describe(
  'Packs - Edit',
  // TODO: failing on MKI https://github.com/elastic/kibana/issues/200302
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    let savedQueryId: string;
    let savedQueryName: string;
    let nomappingSavedQueryId: string;
    let nomappingSavedQueryName: string;
    let oneMappingSavedQueryId: string;
    let oneMappingSavedQueryName: string;
    let multipleMappingsSavedQueryId: string;
    let multipleMappingsSavedQueryName: string;

    before(() => {
      loadSavedQuery().then((data) => {
        savedQueryId = data.saved_object_id;
        savedQueryName = data.id;
      });
      loadSavedQuery({
        ecs_mapping: {},
        interval: '60',
        query: 'select * from uptime;',
      }).then((data) => {
        nomappingSavedQueryId = data.saved_object_id;
        nomappingSavedQueryName = data.id;
      });
      loadSavedQuery({
        ecs_mapping: {
          'client.geo.continent_name': {
            field: 'seconds',
          },
        },
        interval: '60',
        query: 'select * from uptime;',
        timeout: 607,
      }).then((data) => {
        oneMappingSavedQueryId = data.saved_object_id;
        oneMappingSavedQueryName = data.id;
      });
      loadSavedQuery({
        ecs_mapping: {
          labels: {
            field: 'days',
          },
          tags: {
            field: 'seconds',
          },
          'client.address': {
            field: 'total_seconds',
          },
        },
        interval: '60',
        query: 'select * from uptime;',
      }).then((data) => {
        multipleMappingsSavedQueryId = data.saved_object_id;
        multipleMappingsSavedQueryName = data.id;
      });
    });

    beforeEach(() => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
      navigateTo('/app/osquery');
    });

    after(() => {
      cleanupSavedQuery(savedQueryId);
      cleanupSavedQuery(nomappingSavedQueryId);
      cleanupSavedQuery(oneMappingSavedQueryId);
      cleanupSavedQuery(multipleMappingsSavedQueryId);
    });

    // Combines: edit pack, ID validation, deactivate/activate, delete queries, and delete pack
    describe('pack edit operations and lifecycle', { tags: ['@ess', '@serverless'] }, () => {
      let packId: string;
      let packName: string;

      beforeEach(() => {
        createStandardPack(savedQueryName).then((pack) => {
          packId = pack.saved_object_id;
          packName = pack.name;
        });
      });

      afterEach(() => {
        cleanupPack(packId);
      });

      it('should edit pack, validate unique ID, and manage queries', () => {
        const newQueryName = 'new-query-name' + generateRandomStringName(1)[0];

        // Edit pack: add new query with unique ID validation
        preparePack(packName);
        cy.getBySel('edit-pack-button').click();
        cy.contains(`Edit ${packName}`);
        cy.getBySel(ADD_QUERY_BUTTON).click();
        cy.contains('Attach next query');
        inputQuery('select * from uptime');
        cy.get(formFieldInputSelector('id')).type(`${savedQueryName}{downArrow}{enter}`);
        cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();
        cy.contains('ID must be unique').should('exist');
        cy.get(formFieldInputSelector('id')).type(`${newQueryName}{downArrow}{enter}`);
        cy.contains('ID must be unique').should('not.exist');
        cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();
        cy.get(TABLE_ROWS).contains(newQueryName);
        cy.getBySel(UPDATE_PACK_BUTTON).click();
        closeModalIfVisible();
        cy.contains(`Successfully updated "${packName}" pack`);
        closeToastIfVisible();
      });

      it('should trigger validation when saved query is chosen with existing ID', () => {
        preparePack(packName);
        cy.getBySel(EDIT_PACK_HEADER_BUTTON).click();
        cy.getBySel(ADD_QUERY_BUTTON).click();
        cy.contains('Attach next query');
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        cy.getBySel(LIVE_QUERY_EDITOR).should('exist');
        cy.contains('ID must be unique').should('not.exist');
        cy.getBySel(SAVED_QUERY_DROPDOWN_SELECT).type(`${savedQueryName}{downArrow}{enter}`);
        cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();
        cy.contains('ID must be unique').should('exist');
        cy.getBySel(FLYOUT_SAVED_QUERY_CANCEL_BUTTON).click();
      });

      it('should deactivate, activate, and delete all queries in pack', () => {
        // Deactivate and activate
        navigateTo('/app/osquery/packs');
        changePackActiveStatus(packName);
        changePackActiveStatus(packName);

        // Delete all queries
        preparePack(packName);
        cy.contains(/^Edit$/).click();
        cy.getBySel('checkboxSelectAll').click();
        cy.contains(/^Delete \d+ quer(y|ies)/).click();
        cy.contains(/^Update pack$/).click();
        closeModalIfVisible();
        cy.get('a').contains(packName).click();
        cy.contains(`${packName} details`).should('exist');
        cy.contains(/^No items found/).should('exist');
      });

      it('should delete pack', () => {
        preparePack(packName);
        cy.getBySel(EDIT_PACK_HEADER_BUTTON).click();
        deleteAndConfirm('pack');
      });
    });

    describe('should verify that packs are triggered', { tags: ['@ess', '@serverless'] }, () => {
      let packId: string;
      let packName: string;

      beforeEach(() => {
        createStandardPack(savedQueryName).then((pack) => {
          packId = pack.saved_object_id;
          packName = pack.name;
        });
      });

      afterEach(() => {
        cleanupPack(packId);
      });

      it('', () => {
        preparePack(packName);
        cy.contains(`${packName} details`).should('exist');

        recurse<string>(
          () => {
            cy.getBySel('docsLoading').should('exist');
            cy.getBySel('docsLoading').should('not.exist');

            return cy
              .get('tbody .euiTableRow > td:nth-child(5) > .euiTableCellContent')
              .invoke('text');
          },
          (response) => response !== '-',
          {
            timeout: 300000,
            post: () => {
              cy.reload();
            },
          }
        );
        cy.getBySel('last-results-date').should('exist');
        cy.getBySel('docs-count-badge').contains('1');
        cy.getBySel('agent-count-badge').contains('1');
        cy.getBySel('packResultsErrorsEmpty').should('have.length', 1);
      });
    });

    // Combines: open lens + open discover in new tab
    describe(
      'should open lens and discover in new tab',
      { tags: ['@ess', '@brokenInServerless'] },
      () => {
        let packId: string;
        let packName: string;

        before(() => {
          createStandardPack(savedQueryName).then((pack) => {
            packId = pack.saved_object_id;
            packName = pack.name;
          });
        });

        after(() => {
          cleanupPack(packId);
        });

        it('should open lens from pack details', () => {
          let lensUrl = '';
          preparePack(packName);
          cy.getBySel('docsLoading').should('exist');
          cy.getBySel('docsLoading').should('not.exist');
          // Stub window.open AFTER preparePack navigates — cy.visit() resets stubs
          cy.window().then((win) => {
            cy.stub(win, 'open')
              .as('windowOpen')
              .callsFake((url) => {
                lensUrl = url;
              });
          });
          cy.get(`[aria-label="View in Lens"]`).eq(0).click();
          cy.get('@windowOpen').should('have.been.calledOnce');
          cy.then(() => {
            assert.notEqual(
              lensUrl,
              '',
              'Expected lensUrl to have been captured by window.open stub'
            );
            cy.visit(lensUrl);
          });
          cy.getBySel('lnsWorkspace', { timeout: 120000 }).should('exist');
          cy.getBySel('breadcrumbs').contains(`Action pack_default--${packName}_${savedQueryName}`);
        });

        it('should open discover from pack details', () => {
          preparePack(packName);
          cy.getBySel('docsLoading').should('exist');
          cy.getBySel('docsLoading').should('not.exist');
          cy.get(`[aria-label="View in Discover"]`)
            .eq(0)
            .should('have.attr', 'href')
            .then(($href) => {
              const actionId = `pack_default--${packName}_${savedQueryName}`;
              expect($href).to.include(encodeURIComponent(actionId));
              // @ts-expect-error-next-line href string - check types
              cy.visit($href);
              cy.getBySel('breadcrumbs').contains('Discover').should('exist');
            });
        });
      }
    );

    describe(
      'enable changing saved queries and ecs_mappings',
      { tags: ['@ess', '@serverless'] },
      () => {
        let packId: string;
        let packName: string;

        beforeEach(() => {
          createStandardPack(savedQueryName).then((pack) => {
            packId = pack.saved_object_id;
            packName = pack.name;
          });
        });

        afterEach(() => {
          cleanupPack(packId);
        });

        it('', () => {
          preparePack(packName);
          cy.contains(/^Edit$/).click();

          cy.getBySel(ADD_QUERY_BUTTON).click();

          cy.getBySel('globalLoadingIndicator').should('not.exist');
          cy.getBySel(LIVE_QUERY_EDITOR).should('exist');
          cy.getBySel(SAVED_QUERY_DROPDOWN_SELECT).type(
            `${multipleMappingsSavedQueryName} {downArrow} {enter}`
          );
          cy.contains('Custom key/value pairs').should('exist');
          cy.contains('Days of uptime').should('exist');
          cy.contains('List of keywords used to tag each').should('exist');
          cy.contains('Seconds of uptime').should('exist');
          cy.contains('Client network address.').should('exist');
          cy.contains('Total uptime seconds').should('exist');
          cy.getBySel('ECSMappingEditorForm').should('have.length', 4);

          cy.getBySel(SAVED_QUERY_DROPDOWN_SELECT).type(
            `${nomappingSavedQueryName} {downArrow} {enter}`
          );
          cy.contains('Custom key/value pairs').should('not.exist');
          cy.contains('Days of uptime').should('not.exist');
          cy.contains('List of keywords used to tag each').should('not.exist');
          cy.contains('Seconds of uptime').should('not.exist');
          cy.contains('Client network address.').should('not.exist');
          cy.contains('Total uptime seconds').should('not.exist');
          cy.getBySel('ECSMappingEditorForm').should('have.length', 1);

          cy.getBySel(SAVED_QUERY_DROPDOWN_SELECT).type(
            `${oneMappingSavedQueryName} {downArrow} {enter}`
          );
          cy.contains('Name of the continent').should('exist');
          cy.contains('Seconds of uptime').should('exist');
          cy.getBySel('ECSMappingEditorForm').should('have.length', 2);

          cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();
          cy.get(customActionEditSavedQuerySelector(oneMappingSavedQueryName)).click();

          cy.contains('Name of the continent').should('exist');
          cy.contains('Seconds of uptime').should('exist');
          cy.getBySel('timeout-input').should('have.value', '607');
        });
      }
    );
  }
);
