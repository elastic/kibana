/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef } from 'react';
import { EuiProgress } from '@elastic/eui';
import { type MarkdownValueControl, type EditorBaseProps, type MarkdownEditorRef } from './types';
import { constructFileKindIdByOwner } from '../../../common/files';
import { type Owner } from '../../../common/constants/types';
import { useImagePasteUpload } from './paste_upload';
import { MarkdownEditor } from './editor';

interface PastableMarkdownEditorProps extends EditorBaseProps {
  field: MarkdownValueControl;
  caseId: string;
  owner: Owner;
}

const PastableMarkdownEditorComponent = forwardRef<MarkdownEditorRef, PastableMarkdownEditorProps>(
  (props, ref) => {
    const {
      ariaLabel,
      field,
      caseId,
      editorId,
      disabledUiPlugins,
      'data-test-subj': dataTestSubj,
      owner,
    } = props;

    const fileKindId = constructFileKindIdByOwner(owner);

    const { isUploading, errors } = useImagePasteUpload({
      editorRef: ref,
      field,
      caseId,
      owner,
      fileKindId,
    });

    return (
      <>
        <EuiProgress
          css={{
            visibility: isUploading ? 'visible' : 'hidden',
          }}
          size="m"
        />
        <MarkdownEditor
          ref={ref}
          ariaLabel={ariaLabel}
          editorId={editorId}
          onChange={field.setValue}
          value={field.value}
          disabledUiPlugins={disabledUiPlugins}
          data-test-subj={`${dataTestSubj}-markdown-editor`}
          errors={errors}
        />
      </>
    );
  }
);

PastableMarkdownEditorComponent.displayName = 'PastableMarkdownEditor';

export const PastableMarkdownEditor = React.memo(PastableMarkdownEditorComponent);
