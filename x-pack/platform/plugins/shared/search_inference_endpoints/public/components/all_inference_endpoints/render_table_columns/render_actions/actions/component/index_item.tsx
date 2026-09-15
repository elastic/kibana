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
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  EuiTextTruncate,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback } from 'react';

import { useKibana } from '../../../../../../hooks/use_kibana';
import type { InferenceUsageInfo } from '../../../../types';

interface UsageProps {
  usageItem: InferenceUsageInfo;
}
export const IndexItem: React.FC<UsageProps> = ({ usageItem }) => {
  const {
    services: { share },
  } = useKibana();
  const navigateToIndex = useCallback(async () => {
    if (!usageItem?.id) return;

    const indexManagementLocator = share?.url.locators.get('SEARCH_INDEX_MANAGEMENT_LOCATOR_ID');
    if (indexManagementLocator) {
      const url = await indexManagementLocator.getUrl({
        page: 'index_details',
        indexName: usageItem.id,
      });
      if (url) window.open(url, '_blank');
    }
  }, [share, usageItem.id]);

  return (
    <EuiFlexGroup gutterSize="s" direction="column" data-test-subj="usageItem">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiTextTruncate text={usageItem.id} />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{usageItem.type}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink data-test-subj="navigateToIndexPage" onClick={navigateToIndex}>
              <EuiIcon size="s" type="external" aria-hidden={true} />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
