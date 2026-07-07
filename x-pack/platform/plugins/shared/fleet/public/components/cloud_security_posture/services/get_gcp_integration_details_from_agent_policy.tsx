/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../../../types';

/**
 * Get the project id, organization id and account type of gcp integration from an agent policy
 */
export const getGcpIntegrationDetailsFromAgentPolicy = (selectedPolicy?: AgentPolicy) => {
  let gcpProjectId = selectedPolicy?.package_policies?.reduce((acc, packagePolicy) => {
    const findGcpProjectId = packagePolicy.inputs?.reduce((accInput, input) => {
      if (accInput !== '') {
        return accInput;
      }
      if (input?.enabled && input?.streams[0]?.vars?.['gcp.project_id']?.value) {
        return input?.streams[0]?.vars?.['gcp.project_id']?.value;
      }
      return accInput;
    }, '');
    if (findGcpProjectId) {
      return findGcpProjectId;
    }
    return acc;
  }, '');

  let gcpOrganizationId = selectedPolicy?.package_policies?.reduce((acc, packagePolicy) => {
    const findGcpProjectId = packagePolicy.inputs?.reduce((accInput, input) => {
      if (accInput !== '') {
        return accInput;
      }
      if (input?.enabled && input?.streams[0]?.vars?.['gcp.organization_id']?.value) {
        return input?.streams[0]?.vars?.['gcp.organization_id']?.value;
      }
      return accInput;
    }, '');
    if (findGcpProjectId) {
      return findGcpProjectId;
    }
    return acc;
  }, '');

  let gcpAccountType = selectedPolicy?.package_policies?.reduce((acc, packagePolicy) => {
    const findGcpProjectId = packagePolicy.inputs?.reduce((accInput, input) => {
      if (accInput !== '') {
        return accInput;
      }
      if (input?.enabled && input?.streams[0]?.vars?.['gcp.account_type']?.value) {
        return input?.streams[0]?.vars?.['gcp.account_type']?.value;
      }
      return accInput;
    }, '');
    if (findGcpProjectId) {
      return findGcpProjectId;
    }
    return acc;
  }, '');

  gcpProjectId = gcpProjectId !== '' ? gcpProjectId : undefined;
  gcpOrganizationId = gcpOrganizationId !== '' ? gcpOrganizationId : undefined;
  gcpAccountType = gcpAccountType !== '' ? gcpAccountType : undefined;

  return {
    gcpProjectId,
    gcpOrganizationId,
    gcpAccountType,
  };
};
