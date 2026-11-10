/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type ReactNode } from 'react';
import { EuiFieldText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useChangeNodeWords, type InlineEditableField } from '../runtime/inline_edit_context';

interface EditableTextProps {
  nodeId: string;
  field: InlineEditableField;
  /** The words as they are written in the document, with their values not yet put in. */
  words: string;
  /** The words as they are shown. */
  children: ReactNode;
}

/**
 * The words of a component, changed where they are shown when the page allows it: pressing them
 * turns them into a field, Enter or leaving the field keeps what was written, and Escape does not.
 * Where the page does not allow it they are only shown.
 */
export const EditableText = ({ nodeId, field, words, children }: EditableTextProps) => {
  const change = useChangeNodeWords();
  const { euiTheme } = useEuiTheme();
  const [draft, setDraft] = useState<string>();

  if (!change) return <>{children}</>;

  const label = i18n.translate('xpack.customApp.editableText.label', {
    defaultMessage: 'Change this text',
  });

  if (draft === undefined) {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={label}
        title={label}
        data-test-subj={`customAppEditable-${nodeId}-${field}`}
        onClick={() => setDraft(words)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setDraft(words);
          }
        }}
        css={css({
          cursor: 'text',
          borderRadius: euiTheme.border.radius.small,
          outlineOffset: euiTheme.size.xs,
          '&:hover, &:focus-visible': {
            outline: `${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderStrongPrimary}`,
          },
        })}
      >
        {children}
      </span>
    );
  }

  const keep = () => {
    // Words cannot be emptied, which would leave nothing to press to bring them back.
    const next = draft.trim();
    if (next !== '' && next !== words) change(nodeId, field, next);
    setDraft(undefined);
  };

  return (
    <EuiFieldText
      autoFocus
      compressed
      fullWidth
      aria-label={label}
      data-test-subj={`customAppEditing-${nodeId}-${field}`}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={keep}
      onKeyDown={(event) => {
        if (event.key === 'Enter') keep();
        if (event.key === 'Escape') setDraft(undefined);
      }}
    />
  );
};
