/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import { ServerlessRoleName } from '../../support/roles';

describe(
  'EXPERIMENTAL - Navigation (queryHistoryRework)',
  {
    tags: ['@ess', '@experimental'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.osquery.enableExperimental=${JSON.stringify([
            'queryHistoryRework',
            'unifiedDataTable',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
    });

    it('should display renamed tabs: History, Packs, Queries', () => {
      navigateTo('/app/osquery');
      cy.contains('History').should('exist');
      cy.contains('Packs').should('exist');
      cy.contains('Queries').should('exist');
      cy.contains('Live queries').should('not.exist');
      cy.contains('Saved queries').should('not.exist');
    });

    it('should redirect root /app/osquery to /app/osquery/history', () => {
      navigateTo('/app/osquery');
      cy.url().should('include', '/app/osquery/history');
    });

    it('should render the live query form at /app/osquery/new', () => {
      navigateTo('/app/osquery/new');
      cy.contains('Agents').should('exist');
      cy.contains('Query').should('exist');
      cy.get('#submit-button').should('exist');
    });

    it('should navigate to /new when clicking "Run query" button', () => {
      navigateTo('/app/osquery');
      cy.contains('Run query').click();
      cy.url().should('include', '/app/osquery/new');
    });

    it('should redirect /live_queries to /history', () => {
      navigateTo('/app/osquery/live_queries');
      cy.url().should('include', '/app/osquery/history');
      cy.url().should('not.include', '/live_queries');
    });

    it('should redirect /live_queries/new to /new', () => {
      navigateTo('/app/osquery/live_queries/new');
      cy.url().should('include', '/app/osquery/new');
      cy.url().should('not.include', '/live_queries');
    });
  }
);
