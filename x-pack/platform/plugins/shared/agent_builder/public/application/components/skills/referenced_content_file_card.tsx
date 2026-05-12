/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFieldText,
  EuiFormRow,
  EuiMarkdownEditor,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { estimateTokens } from '@kbn/agent-builder-common/attachments';
import { useDebouncedValue } from '@kbn/react-hooks';
import { labels } from '../../utils/i18n';
import { buildReferencedContentFullPathPreview } from './referenced_content_path_utils';

export interface ReferencedContentFileCardProps {
  skillName: string;
  fileName: string;
  relativePath: string;
  content: string;
  onFileNameChange: (value: string) => void;
  onRelativePathChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onFileNameBlur?: () => void;
  onRelativePathBlur?: () => void;
  onContentBlur?: () => void;
  fileNameError?: string;
  relativePathError?: string;
  contentError?: string;
  readOnly?: boolean;
}

export const ReferencedContentFileCard: React.FC<ReferencedContentFileCardProps> = ({
  skillName,
  fileName,
  relativePath,
  content,
  onFileNameChange,
  onRelativePathChange,
  onContentChange,
  onFileNameBlur,
  onRelativePathBlur,
  onContentBlur,
  fileNameError,
  relativePathError,
  contentError,
  readOnly = false,
}) => {
  const debouncedContent = useDebouncedValue(content, 300);
  const tokenCount = useMemo(() => estimateTokens(debouncedContent), [debouncedContent]);

  const skillSegment =
    skillName.trim() || labels.skills.referencedFileCard.skillNamePathPlaceholder;

  const fullPathPreview = useMemo(
    () => buildReferencedContentFullPathPreview(skillSegment, relativePath, fileName),
    [skillSegment, relativePath, fileName]
  );

  return (
    <EuiPanel paddingSize="m" hasBorder data-test-subj="agentBuilderSkillReferencedContentFileCard">
      <EuiFormRow
        label={labels.skills.referencedFileCard.fileNameLabel}
        helpText={labels.skills.referencedFileCard.fileNameHelp}
        isInvalid={Boolean(fileNameError)}
        error={fileNameError}
        fullWidth
      >
        <EuiFieldText
          value={fileName}
          onChange={(e) => onFileNameChange(e.target.value)}
          onBlur={onFileNameBlur}
          fullWidth
          isInvalid={Boolean(fileNameError)}
          disabled={readOnly}
          data-test-subj="agentBuilderSkillReferencedContentFileName"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={labels.skills.referencedFileCard.folderPathLabel}
        helpText={labels.skills.referencedFileCard.folderPathHelp}
        isInvalid={Boolean(relativePathError)}
        error={relativePathError}
        fullWidth
      >
        <EuiFieldText
          value={relativePath}
          onChange={(e) => onRelativePathChange(e.target.value)}
          onBlur={onRelativePathBlur}
          fullWidth
          isInvalid={Boolean(relativePathError)}
          disabled={readOnly}
          data-test-subj="agentBuilderSkillReferencedContentRelativePath"
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <EuiText
        size="xs"
        color="subdued"
        data-test-subj="agentBuilderSkillReferencedContentPathPreview"
      >
        {labels.skills.referencedFileCard.fullPathPreview(fullPathPreview)}
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={labels.skills.referencedFileCard.contentLabel}
        isInvalid={Boolean(contentError)}
        error={contentError}
        fullWidth
      >
        <EuiMarkdownEditor
          value={content}
          onChange={onContentChange}
          onBlur={onContentBlur}
          readOnly={readOnly}
          aria-label={labels.skills.referencedFileCard.contentAriaLabel}
          data-test-subj="agentBuilderSkillReferencedContentMarkdown"
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <EuiText
        size="xs"
        color="subdued"
        data-test-subj="agentBuilderSkillReferencedContentTokenEstimate"
      >
        {labels.skills.referencedFileCard.estimatedTokens(tokenCount)}
      </EuiText>
    </EuiPanel>
  );
};
