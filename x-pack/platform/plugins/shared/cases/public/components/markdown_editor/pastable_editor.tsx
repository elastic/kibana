/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useState } from 'react';
import { EuiProgress } from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { constructFileKindIdByOwner } from '../../../common/files';
import { type Owner } from '../../../common/constants/types';
import { useImagePasteUpload } from './use_image_paste_upload';
import { useCasesContext } from '../cases_context/use_cases_context';
import { MarkdownEditor } from './editor';
import { type EditorBaseProps, type MarkdownEditorRef } from './types';

interface PastableMarkdownEditorProps extends EditorBaseProps {
  field: FieldHook<string>;
  caseId?: string;
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
    } = props;

    const { owner: ownerList } = useCasesContext();
    const owner = ownerList[0];
    const fileKindId = constructFileKindIdByOwner(owner as Owner);
    const [editorErrors, setEditorErrors] = useState<Array<string | Error>>([]);

    const { isUploading } = useImagePasteUpload({
      editorRef: ref,
      field,
      caseId,
      owner,
      fileKindId,
      setErrors: setEditorErrors,
    });

    return (
      <>
        {isUploading && <EuiProgress size="m" />}
        <MarkdownEditor
          ref={ref}
          ariaLabel={ariaLabel}
          editorId={editorId}
          onChange={field.setValue}
          value={field.value}
          disabledUiPlugins={disabledUiPlugins}
          data-test-subj={`${dataTestSubj}-markdown-editor`}
          errors={editorErrors}
        />
      </>
    );
  }
);

PastableMarkdownEditorComponent.displayName = 'PastableMarkdownEditor';

export const PastableMarkdownEditor = React.memo(PastableMarkdownEditorComponent);
