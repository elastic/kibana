/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, forwardRef } from 'react';
import { css } from '@emotion/react';

import { EuiContextMenuItem, EuiContextMenuPanel, EuiPopover, EuiButtonIcon } from '@elastic/eui';

import { i18nTexts } from './i18n_texts';

interface Props {
  disabled: boolean;
  hidden: boolean;
  showAddOnFailure: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddOnFailure: () => void;
  'data-test-subj'?: string;
}

const getStyles = ({ hidden }: { hidden?: boolean }) => ({
  container: hidden
    ? css`
        display: none;
      `
    : undefined,
});

export const ContextMenu = forwardRef<HTMLButtonElement, Props>((props, ref) => {
  const { showAddOnFailure, onDuplicate, onAddOnFailure, onDelete, disabled, hidden } = props;
  const styles = getStyles({ hidden });
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const contextMenuItems = [
    <EuiContextMenuItem
      data-test-subj="duplicateButton"
      key="duplicate"
      icon="copy"
      onClick={() => {
        setIsOpen(false);
        onDuplicate();
      }}
    >
      {i18nTexts.duplicateButtonLabel}
    </EuiContextMenuItem>,
    showAddOnFailure ? (
      <EuiContextMenuItem
        data-test-subj="addOnFailureButton"
        key="addOnFailure"
        icon="indexClose"
        onClick={() => {
          setIsOpen(false);
          onAddOnFailure();
        }}
      >
        {i18nTexts.addOnFailureButtonLabel}
      </EuiContextMenuItem>
    ) : undefined,
    <EuiContextMenuItem
      data-test-subj="deleteButton"
      key="delete"
      icon="trash"
      color="danger"
      onClick={() => {
        setIsOpen(false);
        onDelete();
      }}
    >
      {i18nTexts.deleteButtonLabel}
    </EuiContextMenuItem>,
  ].filter(Boolean) as JSX.Element[];

  return (
    <div css={styles.container}>
      <EuiPopover
        data-test-subj={props['data-test-subj']}
        anchorPosition="leftCenter"
        panelPaddingSize="none"
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        button={
          <EuiButtonIcon
            buttonRef={ref}
            data-test-subj="button"
            disabled={disabled}
            onClick={() => setIsOpen((v) => !v)}
            iconType="boxesHorizontal"
            aria-label={i18nTexts.moreButtonAriaLabel}
          />
        }
      >
        <EuiContextMenuPanel items={contextMenuItems} />
      </EuiPopover>
    </div>
  );
});
