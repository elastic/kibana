/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useRuleAuditMetadata } from '../../../hooks/use_rule_audit_metadata';
import { useRule } from '../rule_context';
import { RuleDetailsTable } from './rule_details_table';

export const RuleMetadata: React.FunctionComponent = () => {
  const rule = useRule();
  const { createdByDisplay, createdAtFormatted, updatedByDisplay, updatedAtFormatted } =
    useRuleAuditMetadata(rule);

  const metadataItems = [
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.createdBy', {
        defaultMessage: 'Created by',
      }),
      description: createdByDisplay,
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.createdDate', {
        defaultMessage: 'Created date',
      }),
      description: createdAtFormatted,
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.lastUpdate', {
        defaultMessage: 'Last update',
      }),
      description: updatedAtFormatted,
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.updatedBy', {
        defaultMessage: 'Updated by',
      }),
      description: updatedByDisplay,
    },
  ];

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.alertingV2.ruleDetails.metadata', {
            defaultMessage: 'Metadata',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <RuleDetailsTable items={metadataItems} />
    </>
  );
};
