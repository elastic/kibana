/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';

import {
  ADD_TO_NEW_CASE,
  COPIED_RESULTS_TOAST_TITLE,
  COPY_TO_CLIPBOARD,
} from '../../../../translations';
import { useAddToNewCase } from '../../../../use_add_to_new_case';

export interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  getMarkdownComments: () => string[];
  ilmPhases: string[];
  openCreateCaseFlyout: ({
    comments,
    headerContent,
  }: {
    comments: string[];
    headerContent?: React.ReactNode;
  }) => void;
}

const ActionsComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  getMarkdownComments,
  ilmPhases,
  openCreateCaseFlyout,
}) => {
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

    addSuccessToast({
      title: COPIED_RESULTS_TOAST_TITLE,
    });
  }, [addSuccessToast, getMarkdownComments]);

  const addToNewCaseContextMenuOnClick = useCallback(() => {
    onClickAddToCase();
  }, [onClickAddToCase]);

  const disableAll = ilmPhases.length === 0;

  return (
    <EuiFlexGroup data-test-subj="actions" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          aria-label={ADD_TO_NEW_CASE}
          data-test-subj="addToNewCase"
          disabled={addToNewCaseDisabled || disableAll}
          flush="left"
          iconType="listAdd"
          onClick={addToNewCaseContextMenuOnClick}
          size="xs"
        >
          {ADD_TO_NEW_CASE}
        </EuiButtonEmpty>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          aria-label={COPY_TO_CLIPBOARD}
          data-test-subj="copyToClipboard"
          disabled={disableAll}
          iconType="copyClipboard"
          onClick={onCopy}
          size="xs"
        >
          {COPY_TO_CLIPBOARD}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ActionsComponent.displayName = 'ActionsComponent';

export const Actions = React.memo(ActionsComponent);
