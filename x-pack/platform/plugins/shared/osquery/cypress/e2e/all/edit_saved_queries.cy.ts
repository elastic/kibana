/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customActionEditSavedQuerySelector, UPDATE_QUERY_BUTTON } from '../../screens/packs';
import { navigateTo } from '../../tasks/navigation';
import { loadSavedQuery, cleanupSavedQuery } from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../support/roles';

describe('ALL - Edit saved query', { tags: ['@ess', '@serverless'] }, () => {
  let savedQueryName: string;
  let savedQueryId: string;

  before(() => {
    loadSavedQuery().then((data) => {
      savedQueryId = data.saved_object_id;
      savedQueryName = data.id;
    });
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    navigateTo('/app/osquery/saved_queries');
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
  });

  // Removed: 'by changing ecs mappings and platforms'
  // Migrated to Jest component test: public/packs/queries/platform_checkbox_group_field.test.tsx
  // Phase 2 migration — platform checkbox state and toggle behavior are UI-only assertions
});
