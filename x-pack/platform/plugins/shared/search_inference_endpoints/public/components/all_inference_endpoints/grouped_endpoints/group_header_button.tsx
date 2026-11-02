/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { GroupByOptions, GroupedInferenceEndpointsData } from '../../../types';
import { GroupByIcon } from './group_by_icon';

export interface GroupByHeaderButtonProps {
  data: GroupedInferenceEndpointsData;
  groupBy: GroupByOptions;
}
export const GroupByHeaderButton = ({ data, groupBy }: GroupByHeaderButtonProps) => {
  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      justifyContent="spaceBetween"
      data-test-subj={`${data.groupId}-accordion-header`}
    >
      <GroupByIcon groupBy={groupBy} data={data} />
      <EuiText>
        <strong>{data.groupLabel}</strong>
      </EuiText>
      <EuiSpacer />
      <EuiBadge>
        {i18n.translate(
          'xpack.searchInferenceEndpoints.groupedEndpoints.headers.endpointsCountBadge',
          {
            defaultMessage:
              '{endpointCount} {endpointCount, plural, one {endpoint} other {endpoints}}',
            values: {
              endpointCount: data.endpoints.length,
            },
          }
        )}
      </EuiBadge>
    </EuiFlexGroup>
  );
};
