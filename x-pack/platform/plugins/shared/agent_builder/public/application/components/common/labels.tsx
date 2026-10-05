/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { BadgeList } from './badge_list';

/**
 * The labels an item carries, as badges. Overflow collapses into a `+N` badge rather than a
 * "View more" popover, so a table row never grows past a single line of badges.
 */
export const Labels: React.FC<{
  labels: string[];
  numVisible?: number;
}> = ({ labels, numVisible }) => (
  <BadgeList
    items={labels}
    numVisible={numVisible}
    ariaLabel={i18n.translate('xpack.agentBuilder.labels.ariaLabel', {
      defaultMessage: 'Labels',
    })}
    testSubjPrefix="agentBuilderLabel"
    data-test-subj="agentBuilderLabelsList"
  />
);
