/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { KiRow } from './ki_row';

interface KiListBodyProps {
  aiIndexId: string;
  kis: KiListItem[];
  isLoading: boolean;
  error?: Error;
}

export const KiListBody = ({ aiIndexId, kis, isLoading, error }: KiListBodyProps) => {
  if (isLoading && kis.length === 0) {
    return <EuiSkeletonText lines={4} data-test-subj="contextKiListLoading" />;
  }

  if (error) {
    return (
      <EuiText size="s" color="danger" data-test-subj="contextKiListError">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.error', {
            defaultMessage: 'Unable to load Knowledge Indicators.',
          })}
        </p>
      </EuiText>
    );
  }

  if (kis.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="document"
        titleSize="xs"
        data-test-subj="contextKiListEmpty"
        title={
          <h3>
            {i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.emptyTitle', {
              defaultMessage: 'No Knowledge Indicators found',
            })}
          </h3>
        }
      />
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      responsive={false}
      role="list"
      data-test-subj="contextKiListRows"
    >
      {kis.map((ki, index) => (
        <React.Fragment key={`${ki.index}:${ki.id}`}>
          <div role="listitem">
            <KiRow aiIndexId={aiIndexId} ki={ki} />
          </div>
          {index < kis.length - 1 && <EuiHorizontalRule margin="none" />}
        </React.Fragment>
      ))}
    </EuiFlexGroup>
  );
};
