/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { API_VERSIONS } from '@kbn/osquery-plugin/common/constants';
import {
  ADD_PACK_HEADER_BUTTON,
  ADD_QUERY_BUTTON,
  SAVE_PACK_BUTTON,
  FLYOUT_SAVED_QUERY_SAVE_BUTTON,
  customActionEditSavedQuerySelector,
  POLICY_SELECT_COMBOBOX,
  UPDATE_PACK_BUTTON,
  TABLE_ROWS,
  formFieldInputSelector,
} from '../../screens/packs';
import { navigateTo } from '../../tasks/navigation';
import { inputQuery } from '../../tasks/live_query';
import {
  closeModalIfVisible,
  closeToastIfVisible,
  generateRandomStringName,
  interceptPackId,
} from '../../tasks/integrations';
import { DEFAULT_POLICY } from '../../screens/fleet';
import { getIdFormField, LIVE_QUERY_EDITOR } from '../../screens/live_query';
import {
  loadSavedQuery,
  cleanupSavedQuery,
  cleanupPack,
} from '../../tasks/api_fixtures';
import { SAVED_QUERY_DROPDOWN_SELECT } from '../../screens/packs';
import { request } from '../../tasks/common';
import { ServerlessRoleName } from '../../support/roles';

describe(
  'Packs - Create',
  // TODO: failing on MKI https://github.com/elastic/kibana/issues/200302
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    let savedQueryId: string;
    let savedQueryName: string;

    before(() => {
      loadSavedQuery().then((data) => {
        savedQueryId = data.saved_object_id;
        savedQueryName = data.id;
      });
    });

    beforeEach(() => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
      navigateTo('/app/osquery');
    });

    after(() => {
      cleanupSavedQuery(savedQueryId);
    });

    describe('Check if result type is correct', { tags: ['@ess', '@serverless'] }, () => {
      let resultTypePackId: string;

      beforeEach(() => {
        interceptPackId((pack) => {
          resultTypePackId = pack;
        });
      });

      afterEach(() => {
        cleanupPack(resultTypePackId);
      });

      it('Check if result type is correct', () => {
        const packName = 'ResultType' + generateRandomStringName(1)[0];

        navigateTo('/app/osquery/packs');
        cy.getBySel(ADD_PACK_HEADER_BUTTON).click();
        cy.get(formFieldInputSelector('name')).type(`${packName}{downArrow}{enter}`);

        cy.getBySel(ADD_QUERY_BUTTON).click();

        cy.contains('Attach next query');
        getIdFormField().type('Query1');
        inputQuery('select * from uptime;');
        cy.getBySel('timeout-input').clear().type('601');
        cy.wait(500);
        cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();

        cy.getBySel(ADD_QUERY_BUTTON).click();

        cy.contains('Attach next query');
        getIdFormField().type('Query2');
        inputQuery('select * from uptime;');
        cy.getBySel('timeout-input').clear().type('602');

        cy.getBySel('resultsTypeField').click();
        cy.contains('Differential').click();
        cy.wait(500);
        cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();

        cy.getBySel(ADD_QUERY_BUTTON).click();

        cy.contains('Attach next query');
        getIdFormField().type('Query3');
        inputQuery('select * from uptime;');
        cy.getBySel('timeout-input').clear().type('603');
        cy.getBySel('resultsTypeField').click();
        cy.contains('Differential (Ignore removals)').click();
        cy.wait(500);
        cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();

        cy.getBySel(SAVE_PACK_BUTTON).click();

        cy.getBySel('tablePaginationPopoverButton').click();
        cy.getBySel('tablePagination-50-rows').click();
        cy.contains(packName).click();

        cy.getBySel('edit-pack-button').click();

        cy.contains('Query1');
        cy.contains('Query2');
        cy.contains('Query3');
        cy.get(customActionEditSavedQuerySelector('Query1')).click();

        cy.getBySel('resultsTypeField').contains('Snapshot').click();
        cy.contains('Differential').click();

        cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();

        cy.get(customActionEditSavedQuerySelector('Query2')).click();

        cy.getBySel('resultsTypeField').contains('Differential').click();
        cy.contains('Differential (Ignore removals)').click();
        cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();

        cy.get(customActionEditSavedQuerySelector('Query3')).click();

        cy.getBySel('resultsTypeField').contains('(Ignore removals)').click();
        cy.contains('Snapshot').click();
        cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();

        cy.getBySel(POLICY_SELECT_COMBOBOX).type(`${DEFAULT_POLICY} {downArrow}{enter}`);

        cy.getBySel(UPDATE_PACK_BUTTON).click();
        closeModalIfVisible();

        cy.contains(
          'Create packs to organize sets of queries and to schedule queries for agent policies.'
        );
        const queries = {
          Query1: {
            interval: 3600,
            timeout: 601,
            query: 'select * from uptime;',
            removed: true,
            snapshot: false,
          },
          Query2: {
            interval: 3600,
            timeout: 602,
            query: 'select * from uptime;',
            removed: false,
            snapshot: false,
          },
          Query3: {
            interval: 3600,
            timeout: 603,
            query: 'select * from uptime;',
          },
        };
        request<{ items: PackagePolicy[] }>({
          url: '/internal/osquery/fleet_wrapper/package_policies',
          headers: {
            'Elastic-Api-Version': API_VERSIONS.internal.v1,
          },
        }).then((response) => {
          const item = response.body.items.find(
            (policy: PackagePolicy) => policy.name === `Policy for ${DEFAULT_POLICY}`
          );

          const packKey = `default--${packName}`;
          const actualQueries = item?.inputs[0].config?.osquery.value.packs[packKey].queries;
          const sanitizedQueries = Object.fromEntries(
            Object.entries(actualQueries as Record<string, Record<string, unknown>>).map(
              ([key, value]) => {
                const { schedule_id, start_date, space_id, name, ...rest } = value;

                return [key, rest];
              }
            )
          );
          expect(sanitizedQueries).to.deep.equal(queries);
        });
      });
    });

    describe('Create pack from saved query', { tags: ['@ess', '@serverless'] }, () => {
      let packId: string;
      let packName: string;

      beforeEach(() => {
        interceptPackId((pack) => {
          packId = pack;
        });
        packName = 'Pack-name' + generateRandomStringName(1)[0];
      });

      afterEach(() => {
        cleanupPack(packId);
      });

      it('should add a pack from a saved query', () => {
        navigateTo('/app/osquery/packs');

        cy.getBySel(ADD_PACK_HEADER_BUTTON).click();
        cy.get(formFieldInputSelector('name')).type(`${packName}{downArrow}{enter}`);
        cy.get(formFieldInputSelector('description')).type(`Pack description{downArrow}{enter}`);
        cy.getBySel(POLICY_SELECT_COMBOBOX).type(`${DEFAULT_POLICY} {downArrow}{enter}`);
        cy.getBySel(ADD_QUERY_BUTTON).click();

        cy.contains('Attach next query');
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        cy.getBySel(LIVE_QUERY_EDITOR).should('exist');
        cy.getBySel(SAVED_QUERY_DROPDOWN_SELECT).type(`${savedQueryName}{downArrow}{enter}`);
        cy.getBySel('osquery-interval-field').click().clear().type('5');
        cy.getBySel(FLYOUT_SAVED_QUERY_SAVE_BUTTON).click();

        cy.get(TABLE_ROWS).contains(savedQueryName);
        cy.getBySel(SAVE_PACK_BUTTON).click();
        closeModalIfVisible();
        cy.getBySel('tablePaginationPopoverButton').click();
        cy.getBySel('tablePagination-50-rows').click();
        cy.contains(packName);
        cy.contains(`Successfully created "${packName}" pack`);
        closeToastIfVisible();
      });
    });
  }
);
