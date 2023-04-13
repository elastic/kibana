/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  copyToClipboard,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import {
  ADD_TO_NEW_CASE,
  COPIED_RESULTS_TOAST_TITLE,
  COPY_TO_CLIPBOARD,
} from '../../../../translations';
import * as i18n from './translations';
import { useAddToNewCase } from '../../../../use_add_to_new_case';

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  getMarkdownComments: () => string[];
  openCreateCaseFlyout: ({
    comments,
    headerContent,
  }: {
    comments: string[];
    headerContent?: React.ReactNode;
  }) => void;
}

const TakeActionMenuComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  getMarkdownComments,
  openCreateCaseFlyout,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);
  const onButtonClick = useCallback(() => {
    setIsPopoverOpen((current) => !current);
  }, []);

  const takeActionButton = useMemo(
    () => (
      <EuiButtonEmpty
        aria-label={i18n.TAKE_ACTION}
        iconSide="right"
        iconType="arrowDown"
        onClick={onButtonClick}
      >
        {i18n.TAKE_ACTION}
      </EuiButtonEmpty>
    ),
    [onButtonClick]
  );

  const { disabled: addToNewCaseDisabled, onAddToNewCase } = useAddToNewCase({
    canUserCreateAndReadCases,
    openCreateCaseFlyout,
  });

  const onClickAddToCase = useCallback(
    () => onAddToNewCase([getMarkdownComments().join('\n')]),
    [getMarkdownComments, onAddToNewCase]
  );

  const onCopy = useCallback(() => {
    const markdown = getMarkdownComments().join('\n');
    copyToClipboard(markdown);

    closePopover();

    addSuccessToast({
      title: COPIED_RESULTS_TOAST_TITLE,
    });
  }, [addSuccessToast, closePopover, getMarkdownComments]);

  const addToNewCaseContextMenuOnClick = useCallback(() => {
    closePopover();
    onClickAddToCase();
  }, [closePopover, onClickAddToCase]);

  const items = useMemo(
    () => [
      <EuiContextMenuItem
        disabled={addToNewCaseDisabled}
        key="addToNewCase"
        onClick={addToNewCaseContextMenuOnClick}
      >
        {ADD_TO_NEW_CASE}
      </EuiContextMenuItem>,

      <EuiContextMenuItem key="copyToClipboard" onClick={onCopy}>
        {COPY_TO_CLIPBOARD}
      </EuiContextMenuItem>,
    ],
    [addToNewCaseContextMenuOnClick, addToNewCaseDisabled, onCopy]
  );

  return (
    <EuiPopover
      anchorPosition="downLeft"
      button={takeActionButton}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
      repositionOnScroll
    >
      <EuiContextMenuPanel items={items} size="s" />
    </EuiPopover>
  );
};

TakeActionMenuComponent.displayName = 'TakeActionMenuComponent';

export const TakeActionMenu = React.memo(TakeActionMenuComponent);
