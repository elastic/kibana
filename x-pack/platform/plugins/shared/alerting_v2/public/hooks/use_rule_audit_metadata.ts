/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import moment from 'moment';
import { EMPTY_VALUE } from '../components/rule_details/utils';
import { useBulkGetUserProfiles } from './use_bulk_get_user_profiles';
import { resolveDisplayName } from '../utils/resolve_display_name';

type RuleAuditFields = Pick<RuleResponse, 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'>;

export interface RuleAuditMetadata {
  createdByDisplay: string;
  createdAtFormatted: string;
  updatedByDisplay: string;
  updatedAtFormatted: string;
}

export const useRuleAuditMetadata = (rule?: RuleAuditFields): RuleAuditMetadata => {
  const uiSettings = useService(CoreStart('uiSettings'));
  const dateFormat: string = uiSettings.get('dateFormat');
  const auditUids = [rule?.createdBy, rule?.updatedBy].filter((uid): uid is string => Boolean(uid));
  const { data: profileByUid } = useBulkGetUserProfiles({ uids: auditUids });

  const formatDate = (date: string | undefined): string =>
    date ? moment(date).format(dateFormat) : EMPTY_VALUE;

  return {
    createdByDisplay: resolveDisplayName(rule?.createdBy, profileByUid, EMPTY_VALUE),
    createdAtFormatted: formatDate(rule?.createdAt),
    updatedByDisplay: resolveDisplayName(rule?.updatedBy, profileByUid, EMPTY_VALUE),
    updatedAtFormatted: formatDate(rule?.updatedAt),
  };
};
