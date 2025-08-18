/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import React, { forwardRef } from 'react';
import { PastableMarkdownEditor } from './pastable_editor';
import { type MarkdownEditorRef, type EditorBaseProps } from './types';
import { MarkdownEditor } from './editor';
import { isOwner } from './utils';
import { useCasesContext } from '../cases_context/use_cases_context';

/** Shared props required by both editor variants */
interface Props extends EditorBaseProps {
  field: FieldHook<string>;
  caseId?: string;
  onChange: (value: string) => void;
  value: string;
  /** any additional props accepted by the underlying editor components */
  [key: string]: unknown;
}

/**
 * It is not guaranteed that downstream consumers of cases will have
 * defined a files context. This hook tests if the context is defined.
 */
function useHasFilesContext(): boolean {
  try {
    return !!useFilesContext();
  } catch {
    return false;
  }
}
/**
 * Returns the correct editor (with or without file-paste support) based on the
 * presence of the FilesContext and a `caseId`.
 *
 * This lets higher-level forms stay unaware of the internal branching logic.
 */
export const CommentEditor = forwardRef<MarkdownEditorRef, Props>((props, ref) => {
  // Consumers of Cases may not wrap their tree in <FilesContext>, so guard it.
  const hasFilesContext = useHasFilesContext();
  const { owner: ownerList } = useCasesContext();
  const owner = ownerList[0];

  if (hasFilesContext && props.caseId && isOwner(owner)) {
    return (
      <PastableMarkdownEditor
        {...props}
        ref={ref}
        field={props.field}
        caseId={props.caseId}
        owner={owner}
      />
    );
  }

  return <MarkdownEditor {...props} ref={ref} onChange={props.onChange} value={props.value} />;
});

CommentEditor.displayName = 'CommentEditor';
