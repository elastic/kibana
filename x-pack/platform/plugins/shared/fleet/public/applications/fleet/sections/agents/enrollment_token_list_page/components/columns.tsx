/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate } from '@kbn/i18n-react';

import type { EuiBasicTableColumn } from '@elastic/eui';

import { ApiKeyField } from '../../../../../../components/api_key_field';
import type { EnrollmentAPIKey, GetAgentPoliciesResponseItem } from '../../../../types';
import { getOneEnrollmentAPIKeyToken } from '../../../../hooks';

import { TokenActions } from './token_actions';

export const getColumns = ({
  agentPoliciesById,
  agentPolicies,
  refresh,
}: {
  agentPoliciesById: Record<string, GetAgentPoliciesResponseItem>;
  agentPolicies: GetAgentPoliciesResponseItem[];
  refresh: () => void;
}): Array<EuiBasicTableColumn<EnrollmentAPIKey>> => [
  {
    field: 'name',
    name: i18n.translate('xpack.fleet.enrollmentTokensList.nameTitle', {
      defaultMessage: 'Name',
    }),
    render: (value: string) => value,
  },
  {
    field: 'policy_id',
    name: i18n.translate('xpack.fleet.enrollmentTokensList.policyTitle', {
      defaultMessage: 'Agent policy',
    }),
    render: (policyId: string) => {
      const agentPolicy = agentPoliciesById[policyId];
      const value = agentPolicy ? agentPolicy.name : policyId;
      return (
        <span className="eui-textTruncate" title={value}>
          {value}
        </span>
      );
    },
  },
  {
    field: 'id',
    name: i18n.translate('xpack.fleet.enrollmentTokensList.secretTitle', {
      defaultMessage: 'Secret',
    }),
    render: (apiKeyId: string) => {
      return <ApiKeyField apiKeyId={apiKeyId} getToken={getOneEnrollmentAPIKeyToken} />;
    },
  },
  {
    field: 'created_at',
    name: i18n.translate('xpack.fleet.enrollmentTokensList.createdAtTitle', {
      defaultMessage: 'Created on',
    }),
    width: '150px',
    render: (createdAt: string) => {
      return createdAt ? (
        <FormattedDate year="numeric" month="short" day="2-digit" value={createdAt} />
      ) : null;
    },
  },
  {
    field: 'active',
    name: i18n.translate('xpack.fleet.enrollmentTokensList.activeTitle', {
      defaultMessage: 'Active',
    }),
    width: '80px',
    render: (active: boolean) =>
      active ? (
        <EuiIcon
          type="dot"
          color="success"
          aria-label={i18n.translate('xpack.fleet.enrollmentTokensList.activeValue', {
            defaultMessage: 'Active',
          })}
        />
      ) : null,
  },
  {
    field: 'actions',
    name: i18n.translate('xpack.fleet.enrollmentTokensList.actionsTitle', {
      defaultMessage: 'Actions',
    }),
    width: '70px',
    render: (_: unknown, apiKey: EnrollmentAPIKey) => {
      const agentPolicy = agentPolicies.find((c) => c.id === apiKey.policy_id);
      if (agentPolicy?.is_managed) return null;
      return <TokenActions apiKey={apiKey} refresh={refresh} />;
    },
  },
];
