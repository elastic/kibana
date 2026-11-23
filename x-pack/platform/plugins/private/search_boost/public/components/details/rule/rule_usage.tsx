/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { BoostRuleListItem } from '../../../../common/types';
import { formatStorageSize } from '../../format';
import { DetailsSection } from '../details_section';
import { SettingsList } from '../settings_list';
import { getUsage } from '../../usage';
import {
  MATCHES_LABEL,
  RULE_APPLIES_TO_INFO,
  RULE_COLUMNS,
  STORAGE_SIZE_LABEL,
  USAGE_TITLE,
  formatTargetCount,
} from '../../../translations';

export interface RuleUsageProps {
  rule: BoostRuleListItem;
}

export const RuleUsage = ({ rule }: RuleUsageProps) => {
  const usage = getUsage(rule.matches);

  return (
    <DetailsSection title={USAGE_TITLE} data-test-subj="searchBoostRuleUsage">
      <SettingsList
        items={[
          {
            id: 'matches',
            label: MATCHES_LABEL,
            value: formatTargetCount(rule.type, rule.matches.length),
          },
          {
            id: 'appliesTo',
            label: RULE_COLUMNS.appliesTo,
            info: RULE_APPLIES_TO_INFO,
            value: formatTargetCount(rule.type, usage.appliesTo),
          },
          {
            id: 'storageSize',
            label: STORAGE_SIZE_LABEL,
            value: formatStorageSize(usage.storageSizeInBytes),
          },
        ]}
      />
    </DetailsSection>
  );
};
