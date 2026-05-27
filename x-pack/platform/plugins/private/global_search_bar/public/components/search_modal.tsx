/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css, Global } from '@emotion/react';
import { dynamic } from '@kbn/shared-ux-utility';
import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem, useEuiBreakpoint } from '@elastic/eui';
import type { SearchModalProps } from './types';
import {
  SEARCH_MODAL_SELECTOR_PREFIX,
  SEARCH_MODAL_HEIGHT_VH,
  SEARCH_MODAL_WIDTH_PX,
} from './types';

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

export const SearchModal = (props: SearchModalProps) => {
  const mediumAndUpBreakpoint = useEuiBreakpoint(['m', 'l', 'xl']);

  const modalOverlayStyles = css`
    .${SEARCH_MODAL_SELECTOR_PREFIX} {
      ${mediumAndUpBreakpoint} {
        .euiModal__closeIcon {
          display: none;
        }
        block-size: ${SEARCH_MODAL_HEIGHT_VH}vh;
        inline-size: ${SEARCH_MODAL_WIDTH_PX}px;
      }
    }
  `;

  return (
    <>
      <Global styles={modalOverlayStyles} />
      <LazySearchModal {...props} />
    </>
  );
};
