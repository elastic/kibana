/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css, Global } from '@emotion/react';
import { dynamic } from '@kbn/shared-ux-utility';
import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { SearchModalProps } from './types';
import { SEARCH_MODAL_SELECTOR_PREFIX, SEARCH_MODAL_HEIGHT, SEARCH_MODAL_WIDTH } from './types';

const modalOverlayStyles = css`
  .${SEARCH_MODAL_SELECTOR_PREFIX} {
    block-size: ${SEARCH_MODAL_HEIGHT}vh;
    inline-size: ${SEARCH_MODAL_WIDTH}px;

    .euiModal__closeIcon {
      display: none;
    }
  }
`;

const LazySearchModal = dynamic(
  () => import('./search_modal_internal').then((mod) => ({ default: mod.SearchModalInternal })),
  {
    fallback: (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  }
);
export const SearchModal = (props: SearchModalProps) => (
  <>
    <Global styles={modalOverlayStyles} />
    <LazySearchModal {...props} />
  </>
);
