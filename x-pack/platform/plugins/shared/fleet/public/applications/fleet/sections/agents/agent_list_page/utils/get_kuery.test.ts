/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKuery } from './get_kuery';

describe('getKuery', () => {
  const search = 'base search';
  const selectedTags = ['tag_1', 'tag_2', 'tag_3'];
  const noTags = ['No Tags'];
  const selectedAgentIds = ['agent_id1', 'agent_id2'];
  const selectedAgentPolicies = ['policy1', 'policy2', 'policy3'];
  const selectedStatus = ['healthy', 'unhealthy'];
  const healthyStatuses = ['healthy', 'updating'];
  const inactiveStatuses = ['unhealthy', 'offline', 'inactive', 'unenrolled'];

  it('should return a kuery with base search', () => {
    expect(getKuery({ search })).toEqual('base search');
  });

  it('should return a kuery with selected tags', () => {
    expect(getKuery({ selectedTags })).toEqual(
      'fleet-agents.tags : ("tag_1" or "tag_2" or "tag_3")'
    );
  });
  it('should return a kuery for no tags if selected', () => {
    expect(getKuery({ selectedTags: noTags })).toEqual('((NOT fleet-agents.tags : (*)))');
  });
  it('should return a kuery for no tags and other tags when multiple are selected', () => {
    expect(getKuery({ selectedTags: [...noTags, ...selectedTags] })).toEqual(
      '((NOT fleet-agents.tags : (*)) or fleet-agents.tags : ("tag_1" or "tag_2" or "tag_3"))'
    );
  });

  it('should return a kuery with selected agent policies', () => {
    expect(getKuery({ selectedAgentPolicies })).toEqual(
      'fleet-agents.policy_id : ("policy1" or "policy2" or "policy3")'
    );
  });

  it('should return a kuery with selected agent ids', () => {
    expect(getKuery({ selectedAgentIds })).toEqual(
      'fleet-agents.agent.id : ("agent_id1" or "agent_id2")'
    );
  });

  it('should return a kuery with healthy selected status', () => {
    expect(getKuery({ selectedStatus: healthyStatuses })).toEqual(
      'status:online or (status:updating or status:unenrolling or status:enrolling)'
    );
  });

  it('should return a kuery with unhealthy selected status', () => {
    expect(getKuery({ selectedStatus: inactiveStatuses })).toEqual(
      '(status:error or status:degraded) or status:offline or status:inactive or status:unenrolled'
    );
  });

  it('should return a kuery with a combination of previous kueries', () => {
    expect(getKuery({ search, selectedTags, selectedStatus })).toEqual(
      '((base search) and fleet-agents.tags : ("tag_1" or "tag_2" or "tag_3")) and (status:online or (status:error or status:degraded))'
    );
  });

  it('should return empty string if nothing is passed', () => {
    expect(getKuery({})).toEqual('');
  });
});
