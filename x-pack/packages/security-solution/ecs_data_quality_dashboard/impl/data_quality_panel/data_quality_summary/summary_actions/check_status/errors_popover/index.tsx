/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  copyToClipboard,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiPopover,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import {
  COPY_TO_CLIPBOARD,
  ERRORS_CALLOUT_SUMMARY,
  ERRORS_MAY_OCCUR,
  INDEX,
  MANAGE,
  MONITOR,
  OR,
  READ,
  THE_FOLLOWING_PRIVILEGES_ARE_REQUIRED,
  VIEW_INDEX_METADATA,
} from '../../../../translations';
import { ErrorsViewer } from './errors_viewer';
import { ERRORS_CONTAINER_MAX_WIDTH } from './errors_viewer/helpers';
import type { ErrorSummary } from '../../../../types';
import { getErrorsMarkdownTable, getErrorsMarkdownTableRows } from '../../utils/markdown';
import { ERROR, ERRORS, PATTERN } from '../../translations';
import { COPIED_ERRORS_TOAST_TITLE, VIEW_ERRORS } from './translations';

const CallOut = styled(EuiCallOut)`
  max-width: ${ERRORS_CONTAINER_MAX_WIDTH}px;
`;

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  errorSummary: ErrorSummary[];
}

const ErrorsPopoverComponent: React.FC<Props> = ({ addSuccessToast, errorSummary }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onClick = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const onCopy = useCallback(() => {
    const markdown = getErrorsMarkdownTable({
      errorSummary,
      getMarkdownTableRows: getErrorsMarkdownTableRows,
      headerNames: [PATTERN, INDEX, ERROR],
      title: ERRORS,
    });
    copyToClipboard(markdown);

    closePopover();

    addSuccessToast({
      title: COPIED_ERRORS_TOAST_TITLE,
    });
  }, [addSuccessToast, closePopover, errorSummary]);

  const button = useMemo(
    () => (
      <EuiButtonEmpty
        aria-label={VIEW_ERRORS}
        data-test-subj="viewErrors"
        disabled={errorSummary.length === 0}
        flush="both"
        onClick={onClick}
        size="xs"
      >
        {VIEW_ERRORS}
      </EuiButtonEmpty>
    ),
    [errorSummary.length, onClick]
  );

  return (
    <EuiPopover
      button={button}
      closePopover={closePopover}
      data-test-subj="errorsPopover"
      isOpen={isPopoverOpen}
      panelPaddingSize="s"
    >
      <CallOut color="danger" data-test-subj="callout" size="s" title={ERRORS}>
        <p>{ERRORS_CALLOUT_SUMMARY}</p>

        <p>{ERRORS_MAY_OCCUR}</p>

        <span>{THE_FOLLOWING_PRIVILEGES_ARE_REQUIRED}</span>
        <ul>
          <li>
            <EuiCode>{MONITOR}</EuiCode> {OR} <EuiCode>{MANAGE}</EuiCode>
          </li>
          <li>
            <EuiCode>{VIEW_INDEX_METADATA}</EuiCode>
          </li>
          <li>
            <EuiCode>{READ}</EuiCode>
          </li>
        </ul>

        <EuiButtonEmpty
          aria-label={COPY_TO_CLIPBOARD}
          data-test-subj="copyToClipboard"
          flush="both"
          onClick={onCopy}
          size="xs"
        >
          {COPY_TO_CLIPBOARD}
        </EuiButtonEmpty>
      </CallOut>

      <EuiSpacer />

      <ErrorsViewer errorSummary={errorSummary} />
    </EuiPopover>
  );
};

ErrorsPopoverComponent.displayName = 'ErrorsPopoverComponent';

export const ErrorsPopover = React.memo(ErrorsPopoverComponent);
