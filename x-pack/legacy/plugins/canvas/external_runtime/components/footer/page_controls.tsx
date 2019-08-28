/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { useExternalEmbedState, setScrubberVisible, setPage, setAutoplay } from '../../context';

/**
 * The page count and paging controls within the footer of the Embedded Workpad.
 */
export const PageControls = () => {
  const [{ workpad, footer, page }, dispatch] = useExternalEmbedState();

  if (!workpad) {
    return null;
  }

  const { isScrubberVisible } = footer;

  const toggleScrubber = () => {
    dispatch(setAutoplay(false));
    dispatch(setScrubberVisible(!isScrubberVisible));
  };

  const setPageNumber = (number: number) => dispatch(setPage(number));
  const currentPage = page + 1;
  const totalPages = workpad.pages.length;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" style={{ margin: '0 12px' }}>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          color="ghost"
          onClick={() => setPageNumber(page - 1)}
          iconType="arrowLeft"
          disabled={currentPage <= 1}
          aria-label="Previous Page"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty color="ghost" size="s" onClick={toggleScrubber}>
          <EuiText color="ghost" size="s">
            Page {currentPage}
            {totalPages > 1 ? ` of ${totalPages}` : null}
          </EuiText>
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          color="ghost"
          onClick={() => setPageNumber(page + 1)}
          iconType="arrowRight"
          disabled={currentPage >= totalPages}
          aria-label="Next Page"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
