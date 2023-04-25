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

import { ErrorsViewer } from '../errors_viewer';
import { ERRORS_CONTAINER_MAX_WIDTH } from '../errors_viewer/helpers';
import {
  getErrorsMarkdownTable,
  getErrorsMarkdownTableRows,
} from '../../index_properties/markdown/helpers';
import * as i18n from './translations';
import type { ErrorSummary } from '../../../types';
import { ERROR, INDEX, PATTERN } from '../errors_viewer/translations';

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
      title: i18n.ERRORS,
    });
    copyToClipboard(markdown);

    closePopover();

    addSuccessToast({
      title: i18n.COPIED_ERRORS_TOAST_TITLE,
    });
  }, [addSuccessToast, closePopover, errorSummary]);

  const button = useMemo(
    () => (
      <EuiButtonEmpty
        aria-label={i18n.VIEW_ERRORS}
        data-test-subj="viewErrors"
        disabled={errorSummary.length === 0}
        flush="both"
        onClick={onClick}
        size="xs"
      >
        {i18n.VIEW_ERRORS}
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
      <CallOut color="danger" data-test-subj="callout" size="s" title={i18n.ERRORS}>
        <p>{i18n.ERRORS_CALLOUT_SUMMARY}</p>

        <p>{i18n.ERRORS_MAY_OCCUR}</p>

        <span>{i18n.THE_FOLLOWING_PRIVILEGES_ARE_REQUIRED}</span>
        <ul>
          <li>
            <EuiCode>{i18n.MONITOR}</EuiCode> {i18n.OR} <EuiCode>{i18n.MANAGE}</EuiCode>
          </li>
          <li>
            <EuiCode>{i18n.VIEW_INDEX_METADATA}</EuiCode>
          </li>
          <li>
            <EuiCode>{i18n.READ}</EuiCode>
          </li>
        </ul>

        <EuiButtonEmpty
          aria-label={i18n.COPY_TO_CLIPBOARD}
          data-test-subj="copyToClipboard"
          flush="both"
          onClick={onCopy}
          size="xs"
        >
          {i18n.COPY_TO_CLIPBOARD}
        </EuiButtonEmpty>
      </CallOut>

      <EuiSpacer />

      <ErrorsViewer errorSummary={errorSummary} />
    </EuiPopover>
  );
};

ErrorsPopoverComponent.displayName = 'ErrorsPopoverComponent';

export const ErrorsPopover = React.memo(ErrorsPopoverComponent);
