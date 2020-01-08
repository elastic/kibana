/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import { isNumber, isEmpty } from 'lodash/fp';
import styled from 'styled-components';

import { TimelineNonEcsData } from '../../../../graphql/types';

export const deleteItemIdx = (data: TimelineNonEcsData[], idx: number) => [
  ...data.slice(0, idx),
  ...data.slice(idx + 1),
];

export const findItem = (data: TimelineNonEcsData[], field: string): number =>
  data.findIndex(d => d.field === field);

export const getValues = (field: string, data: TimelineNonEcsData[]): string[] | undefined => {
  const obj = data.find(d => d.field === field);
  if (obj != null && obj.value != null) {
    return obj.value;
  }
  return undefined;
};

export const Details = styled.div`
  margin: 5px 0 5px 10px;
  & .euiBadge {
    margin: 2px 0 2px 0;
  }
`;
Details.displayName = 'Details';

export const TokensFlexItem = styled(EuiFlexItem)`
  margin-left: 3px;
`;
TokensFlexItem.displayName = 'TokensFlexItem';

export function isNillEmptyOrNotFinite<T>(value: string | number | T[] | null | undefined) {
  return isNumber(value) ? !isFinite(value) : isEmpty(value);
}

export const isFileEvent = ({
  eventCategory,
  eventDataset,
}: {
  eventCategory: string | null | undefined;
  eventDataset: string | null | undefined;
}) =>
  (eventCategory != null && eventCategory.toLowerCase() === 'file') ||
  (eventDataset != null && eventDataset.toLowerCase() === 'file');

export const isProcessStoppedOrTerminationEvent = (
  eventAction: string | null | undefined
): boolean => ['process_stopped', 'termination_event'].includes(`${eventAction}`.toLowerCase());

export const showVia = (eventAction: string | null | undefined): boolean =>
  ['file_create_event', 'created', 'file_delete_event', 'deleted'].includes(
    `${eventAction}`.toLowerCase()
  );
