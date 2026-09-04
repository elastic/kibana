/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useContentListItems, useContentListPhase } from '@kbn/content-list-provider';
import React from 'react';
import { toAiIndexHttpItem } from '../../utils/ai_index_content_list_utils';
import { AiIndexManagedRow } from './ai_index_managed_row';

const SKELETON_ROW_COUNT = 1;

const AiIndexManagedRowListSkeleton = () => (
  <>
    {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
      <EuiSkeletonRectangle
        key={`contextAiIndexManagedRowSkeleton-${index}`}
        width="100%"
        height={96}
        borderRadius="m"
        data-test-subj="contextAiIndexManagedRowSkeleton"
      />
    ))}
  </>
);

export const AiIndexManagedRowList = () => {
  const phase = useContentListPhase();
  const { items } = useContentListItems();
  const managedItems = items.map(toAiIndexHttpItem).filter((aiIndex) => aiIndex.managed);

  if (phase === 'initialLoad') {
    return <AiIndexManagedRowListSkeleton />;
  }

  if (managedItems.length === 0) {
    return null;
  }

  return (
    <div data-test-subj="contextAiIndexManagedRowList">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.landing.managedRowList.title"
                defaultMessage="Your AI indices"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="contextAiIndexManagedRowListCount">
            {managedItems.length}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="m">
        {managedItems.map((aiIndex) => (
          <EuiFlexItem key={aiIndex.id} grow={false}>
            <AiIndexManagedRow aiIndex={aiIndex} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};
