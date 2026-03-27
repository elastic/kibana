/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList, EuiSpacer, EuiTitle } from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import type { RuleApiResponse } from '../../../services/rules_api';
import { EMPTY_VALUE } from '../utils';

export interface RuleMetadataProps {
  rule: RuleApiResponse;
}

export const RuleMetadata: React.FunctionComponent<RuleMetadataProps> = ({ rule }) => {
  const uiSettings = useService(CoreStart('uiSettings'));
  const dateFormat = uiSettings.get('dateFormat');
  const formatDate = (value: string) => moment(value).format(dateFormat);

  const metadataItems = [
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.createdBy', {
        defaultMessage: 'Created by',
      }),
      description: rule.createdBy ?? EMPTY_VALUE,
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.createdDate', {
        defaultMessage: 'Created date',
      }),
      description: formatDate(rule.createdAt),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.lastUpdate', {
        defaultMessage: 'Last update',
      }),
      description: formatDate(rule.updatedAt),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.updatedBy', {
        defaultMessage: 'Updated by',
      }),
      description: rule.updatedBy ?? EMPTY_VALUE,
    },
  ];

  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.alertingV2.ruleDetails.metadata', {
            defaultMessage: 'Metadata',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiDescriptionList
        compressed
        type="column"
        listItems={metadataItems}
        css={{ maxWidth: 600 }}
      />
    </>
  );
};
