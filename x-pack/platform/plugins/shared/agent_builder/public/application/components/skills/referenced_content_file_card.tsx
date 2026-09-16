/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiMarkdownEditor,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { estimateTokens } from '@kbn/agent-builder-common/attachments';
import { useDebouncedValue } from '@kbn/react-hooks';
import { labels } from '../../utils/i18n';
import {
  buildReferencedContentFullPathPreview,
  getReferencedFileDisplayName,
} from './referenced_content_path_utils';

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
  footer?: React.ReactNode;
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
  footer,
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'agentBuilderSkillReferencedContentAdvanced' });
  const debouncedContent = useDebouncedValue(content, 300);
  const tokenCount = useMemo(() => estimateTokens(debouncedContent), [debouncedContent]);

  const skillSegment =
    skillName.trim() || labels.skills.referencedFileCard.skillNamePathPlaceholder;

  const fullPathPreview = useMemo(
    () => buildReferencedContentFullPathPreview(skillSegment, relativePath, fileName),
    [skillSegment, relativePath, fileName]
  );

  const displayName = getReferencedFileDisplayName(fileName);

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  useEffect(() => {
    if (relativePathError) setIsAdvancedOpen(true);
  }, [relativePathError]);

  const activeBorderStyle = css`
    border-color: ${euiTheme.colors.primary};
    border-width: 2px;
  `;

  return (
    <EuiPanel
      paddingSize="m"
      hasBorder
      css={activeBorderStyle}
      data-test-subj="agentBuilderSkillReferencedContentFileCard"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="document" color="primary" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="primary">
            {displayName}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

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
          data-test-subj="agentBuilderSkillReferencedContentFileName"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow label={labels.skills.referencedFileCard.contentLabel} fullWidth>
        <EuiMarkdownEditor
          value={content}
          onChange={onContentChange}
          onBlur={onContentBlur}
          aria-label={labels.skills.referencedFileCard.contentAriaLabel}
          data-test-subj="agentBuilderSkillReferencedContentMarkdown"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={accordionId}
        buttonContent={labels.skills.referencedFileCard.advancedLabel}
        forceState={relativePathError || isAdvancedOpen ? 'open' : 'closed'}
        onToggle={setIsAdvancedOpen}
      >
        <EuiSpacer size="s" />
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
      </EuiAccordion>

      <EuiSpacer size="s" />

      <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
        <EuiFlexItem>
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj="agentBuilderSkillReferencedContentTokenEstimate"
          >
            {labels.skills.referencedFileSection.compactTokenCount(tokenCount)}
          </EuiText>
        </EuiFlexItem>
        {footer && <EuiFlexItem grow={false}>{footer}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
