/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSkeletonText, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { ListKiTable } from './list_ki_table';

interface ListKiBodyProps {
  aiIndexId: string;
  kis: KiListItem[];
  isLoading: boolean;
  error?: Error;
}

export const ListKiBody = ({ aiIndexId, kis, isLoading, error }: ListKiBodyProps) => {
  if (isLoading && kis.length === 0) {
    return <EuiSkeletonText lines={4} data-test-subj="contextListKiLoading" />;
  }

  if (error) {
    return (
      <EuiText size="s" color="danger" data-test-subj="contextListKiError">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.error', {
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
        data-test-subj="contextListKiEmpty"
        title={
          <h3>
            {i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.emptyTitle', {
              defaultMessage: 'No Knowledge Indicators found',
            })}
          </h3>
        }
      />
    );
  }

  return (
    <div data-test-subj="contextListKiRows">
      <ListKiTable aiIndexId={aiIndexId} kis={kis} />
    </div>
  );
};
