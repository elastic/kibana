/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeDataViews } from '../../tasks/login';
import { takeOsqueryActionWithParams } from '../../tasks/live_query';
import { ServerlessRoleName } from '../../support/roles';
import { disableNewFeaturesTours } from '../../tasks/navigation';

describe('ALL - Timelines', { tags: ['@ess'] }, () => {
  before(() => {
    initializeDataViews();
  });
  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
  });

  it('should substitute osquery parameter on non-alert event take action', () => {
    cy.visit('/app/security/timelines', {
      onBeforeLoad: (win) => {
        disableNewFeaturesTours(win);
      },
    });
    cy.getBySel('timeline-bottom-bar').within(() => {
      cy.getBySel('timeline-bottom-bar-title-button').click();
    });
    cy.getBySel('timelineQueryInput').type(
      'NOT host.name: "dev-fleet-server*" and component.type: "osquery" AND (_index: "logs-*" OR _index: "filebeat-*"){enter}'
    );

    // Force true due to pointer-events: none on parent prevents user mouse interaction.
    cy.getBySel('docTableExpandToggleColumn').first().click({ force: true });
    takeOsqueryActionWithParams();
  });
});
