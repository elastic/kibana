/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiButtonEmpty, EuiText } from '@elastic/eui';

export type onSetPageNumberProp = (page: number) => void;
export type onToggleScrubberProp = () => void;

interface Props {
  page: number;
  totalPages: number;
  onSetPageNumber: onSetPageNumberProp;
  onToggleScrubber: onToggleScrubberProp;
}

/**
 * The page count and paging controls within the footer of the Embedded Workpad.
 */
export const PageControls = ({ onSetPageNumber, page, totalPages, onToggleScrubber }: Props) => {
  const currentPage = page + 1;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" style={{ margin: '0 12px' }}>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          color="ghost"
          data-test-subj="pageControlsPrevPage"
          onClick={() => onSetPageNumber(page - 1)}
          iconType="arrowLeft"
          disabled={currentPage <= 1}
          aria-label="Previous Page"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="ghost"
          size="s"
          onClick={onToggleScrubber}
          data-test-subj="pageControlsCurrentPage"
        >
          <EuiText color="ghost" size="s">
            Page {currentPage}
            {totalPages > 1 ? ` of ${totalPages}` : null}
          </EuiText>
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          color="ghost"
          data-test-subj="pageControlsNextPage"
          onClick={() => onSetPageNumber(page + 1)}
          iconType="arrowRight"
          disabled={currentPage >= totalPages}
          aria-label="Next Page"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
