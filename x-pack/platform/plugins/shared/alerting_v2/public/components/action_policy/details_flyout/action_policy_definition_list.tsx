/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import {
  getDescriptionItem,
  getMatcherItem,
  getDispatchModeItem,
  getGroupByItem,
  getFrequencyItem,
  getDestinationsItem,
} from './definition_items';

export interface ActionPolicyDefinitionListProps {
  policy: Partial<ActionPolicyResponse>;
}

export const ActionPolicyDefinitionList = ({ policy }: ActionPolicyDefinitionListProps) => {
  const groupByItem = getGroupByItem(policy);

  const items = [
    getDescriptionItem(policy),
    getMatcherItem(policy),
    getDispatchModeItem(policy),
    ...(groupByItem ? [groupByItem] : []),
    getFrequencyItem(policy),
    getDestinationsItem(policy),
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <EuiDescriptionList
      compressed
      type="column"
      columnWidths={[1, 3]}
      descriptionProps={{ style: { minWidth: 0 } }}
      listItems={items}
    />
  );
};
