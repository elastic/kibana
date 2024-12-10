/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerlessRoleName } from '../../support/roles';
import {
  addOsqueryToAgentPolicy,
  cleanupAgentPolicy,
  cleanupPack,
  createPack,
  getInstalledOsqueryIntegrationVersion,
  getPack,
  loadAgentPolicy,
} from '../../tasks/api_fixtures';

describe('Packs', { tags: ['@ess', '@serverless'] }, () => {
  let policyId: string;

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    loadAgentPolicy().then((item) => {
      policyId = item.id;

      return getInstalledOsqueryIntegrationVersion().then((response) =>
        addOsqueryToAgentPolicy(policyId, item.name, response.version)
      );
    });
  });

  afterEach(() => {
    cleanupAgentPolicy(policyId);
  });

  describe('Duplicate policy ids', () => {
    let packId: string;
    beforeEach(() => {
      createPack({
        policy_ids: Array(1000).fill(policyId),
      }).then((response) => {
        packId = response.body.data.saved_object_id;
        expect(response.status).to.eq(200);
      });
    });
    afterEach(() => {
      cleanupPack(packId);
    });

    it('should strip duplicate policy ids when saving pack', () => {
      getPack(packId).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data.policy_ids).to.have.length(1);
        expect(response.body.data.policy_ids[0]).to.eq(policyId);
      });
    });
  });

  describe('Non existent policy id should return bad request error', () => {
    const nonExistentPolicyId = 'non-existent-policy-id';
    it('single non-existent policy id', () => {
      createPack({
        policy_ids: [nonExistentPolicyId],
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.message).to.contain(nonExistentPolicyId);
      });
    });
    it('multiple policy ids with one non-existent policy id', () => {
      createPack({
        policy_ids: [...Array(999).fill(policyId), nonExistentPolicyId],
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.message).to.contain(nonExistentPolicyId);
      });
    });
  });
});
