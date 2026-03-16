/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import type { AccountType } from '../../../types';

import { ORGANIZATION_ACCOUNT, SINGLE_ACCOUNT } from '../constants';

export interface CloudConnectorPrefillParams {
  roleArn?: string;
  externalId?: string;
  accountType?: AccountType;
  stackName?: string;
  region?: string;
  isPrefilled: boolean;
}

const parseAccountType = (value: string | null): AccountType | undefined => {
  if (value === SINGLE_ACCOUNT || value === ORGANIZATION_ACCOUNT) {
    return value;
  }

  return undefined;
};

/**
 * Reads Cloud Connector prefill params from the URL query string.
 * These params are set by the CloudFormation CompletionUrl output
 * when the user completes the frictionless setup flow.
 */
export const useCloudConnectorPrefill = (): CloudConnectorPrefillParams => {
  const { search, pathname } = useLocation();

  return useMemo(() => {
    const isCompletionRoute = pathname.includes('complete-integration-setup');
    if (!isCompletionRoute) {
      return { isPrefilled: false };
    }

    const params = new URLSearchParams(search);
    const roleArn = params.get('role_arn') || undefined;
    const externalId = params.get('external_id') || undefined;
    const accountType = parseAccountType(params.get('account_type'));
    const stackName = params.get('stack_name') || undefined;
    const region = params.get('region') || undefined;

    const isPrefilled = !!(roleArn && externalId);

    return { roleArn, externalId, accountType, stackName, region, isPrefilled };
  }, [pathname, search]);
};
