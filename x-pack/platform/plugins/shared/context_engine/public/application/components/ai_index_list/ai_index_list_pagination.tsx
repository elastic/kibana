/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPagination, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useContentListPagination, useContentListPhase } from '@kbn/content-list-provider';
import React from 'react';

export const AiIndexListPagination = () => {
  const phase = useContentListPhase();
  const { isSupported, pageIndex, pageCount, setPageIndex } = useContentListPagination();

  if (!isSupported || pageCount <= 1 || phase === 'filtered') {
    return null;
  }

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiPagination
            data-test-subj="contextAiIndexListPagination"
            aria-label={i18n.translate('xpack.contextEngine.landing.paginationLabel', {
              defaultMessage: 'AI Index pagination',
            })}
            pageCount={pageCount}
            activePage={pageIndex}
            onPageClick={setPageIndex}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
