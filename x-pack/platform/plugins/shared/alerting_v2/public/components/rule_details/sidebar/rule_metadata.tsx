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
import React, { useMemo } from 'react';
import { useBulkGetUserProfiles } from '../../../hooks/use_bulk_get_user_profiles';
import { resolveDisplayName } from '../../../utils/resolve_display_name';
import { useRule } from '../rule_context';
import { EMPTY_VALUE } from '../utils';

export const RuleMetadata: React.FunctionComponent = () => {
  const rule = useRule();
  const uiSettings = useService(CoreStart('uiSettings'));
  const dateFormat = uiSettings.get('dateFormat');
  const formatDate = (value: string) => moment(value).format(dateFormat);

  const metadataUids = useMemo(
    () => [rule.createdBy, rule.updatedBy].filter((uid): uid is string => Boolean(uid)),
    [rule.createdBy, rule.updatedBy]
  );

  const { data: profileByUid } = useBulkGetUserProfiles({ uids: metadataUids });

  const metadataItems = [
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.createdBy', {
        defaultMessage: 'Created by',
      }),
      description: resolveDisplayName(rule.createdBy, profileByUid, EMPTY_VALUE),
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
      description: resolveDisplayName(rule.updatedBy, profileByUid, EMPTY_VALUE),
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
