/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import {
  ActionButtonType,
  type ActionButton,
  type AttachmentRenderProps,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { SkillReferencedContent } from '@kbn/agent-builder-common';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  SKILL_DRAFT_ATTACHMENT_TYPE,
  type SkillDraftAttachment,
  type SkillDraftAttachmentData,
} from '../../../common/attachments';

/**
 * Path of the agent builder public skills API. Matches the constant
 * `publicApiPath` from `@kbn/agent-builder-plugin/common/constants` (we
 * inline it to avoid pulling in the entire agent_builder public package
 * just for one string).
 */
const SKILLS_CREATE_API_PATH = '/api/agent_builder/skills';

const PREVIEW_MAX_LINES = 30;
const PREVIEW_MAX_HEIGHT_PX = 240;

const viewFullSkillLabel = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.skillDraft.viewFullSkillButtonLabel',
  { defaultMessage: 'View full skill' }
);
const createdLabel = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.skillDraft.createdButtonLabel',
  {
    defaultMessage: 'Created',
  }
);
const createSkillLabel = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.skillDraft.createButtonLabel',
  {
    defaultMessage: 'Create skill',
  }
);
const lackManageSkillsPermissionDescription = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.skillDraft.createDisabledReason',
  {
    defaultMessage: 'You do not have permission to manage skills in this space.',
  }
);

/**
 * Trim a multi-line markdown body to a preview suitable for the inline card.
 * The agent's `content` can be hundreds of lines; we show the first chunk
 * inline and let the user open the full skill in the canvas flyout for the
 * rest.
 */
const previewContent = (content: string): { preview: string; truncated: boolean } => {
  const lines = content.split('\n');
  if (lines.length <= PREVIEW_MAX_LINES) {
    return { preview: content, truncated: false };
  }
  return {
    preview: lines.slice(0, PREVIEW_MAX_LINES).join('\n'),
    truncated: true,
  };
};

const renderBoldChunks = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

const SkillDraftReferences = ({
  toolIds,
  referencedContent,
}: {
  toolIds: string[];
  referencedContent: SkillReferencedContent[] | undefined;
}) => {
  const hasTools = toolIds.length > 0;
  const hasFiles = (referencedContent?.length ?? 0) > 0;
  if (!hasTools && !hasFiles) {
    return null;
  }
  return (
    <>
      <EuiText size="xs" color="subdued">
        <strong>
          <FormattedMessage
            id="xpack.agentBuilderPlatform.attachments.skillDraft.referencesLabel"
            defaultMessage="References"
          />
        </strong>
      </EuiText>
      {hasTools && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            {toolIds.map((toolId) => (
              <EuiFlexItem grow={false} key={toolId}>
                <EuiBadge color="hollow">
                  <FormattedMessage
                    id="xpack.agentBuilderPlatform.attachments.skillDraft.toolBadge"
                    defaultMessage="<bold>tool:</bold> {toolName}"
                    values={{ toolName: toolId, bold: renderBoldChunks }}
                  />
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
      {hasFiles && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            {referencedContent!.map((file) => (
              <EuiFlexItem grow={false} key={file.relativePath}>
                <EuiBadge color="hollow">
                  <FormattedMessage
                    id="xpack.agentBuilderPlatform.attachments.skillDraft.fileBadge"
                    defaultMessage="<bold>file:</bold> {fileName}"
                    values={{ fileName: file.name, bold: renderBoldChunks }}
                  />
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

const fullContentInstructionsStyles = css`
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
`;
const previewInstructionsStyles = css`
  width: 100%;
  & pre {
    margin-block-end: 0;
  }
`;
const SkillDraftInstructions = ({
  showFullContent,
  content,
}: {
  showFullContent: boolean;
  content: string;
}) => {
  let shownContent = content;
  let truncated = false;
  if (!showFullContent) {
    ({ preview: shownContent, truncated } = previewContent(content));
  }
  return (
    <>
      <EuiText size="xs" color="subdued">
        <strong>
          {showFullContent ? (
            <FormattedMessage
              id="xpack.agentBuilderPlatform.attachments.skillDraft.instructionsFullLabel"
              defaultMessage="Instructions"
            />
          ) : (
            <FormattedMessage
              id="xpack.agentBuilderPlatform.attachments.skillDraft.instructionsLabel"
              defaultMessage="Instructions preview"
            />
          )}
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiCodeBlock
        language="markdown"
        fontSize="s"
        overflowHeight={showFullContent ? '100%' : PREVIEW_MAX_HEIGHT_PX}
        isCopyable={showFullContent}
        css={showFullContent ? fullContentInstructionsStyles : previewInstructionsStyles}
      >
        {shownContent}
      </EuiCodeBlock>
      {!showFullContent && truncated && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.agentBuilderPlatform.attachments.skillDraft.previewTruncated"
              defaultMessage='Preview truncated to the first {lineCount} lines. Use "View full skill" to see the complete instructions.'
              values={{ lineCount: PREVIEW_MAX_LINES }}
            />
          </EuiText>
        </>
      )}
    </>
  );
};

interface SkillDraftCardProps extends AttachmentRenderProps<SkillDraftAttachment> {
  isCanvas?: boolean;
}

const fullContentPanelStyles = css`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const SkillDraftCard: React.FC<SkillDraftCardProps> = ({ attachment, isCanvas }) => {
  const {
    content,
    description,
    tool_ids: toolIds,
    referenced_content: referencedContent,
  } = attachment.data;
  const showFullContent = isCanvas === true;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="m"
      css={showFullContent && fullContentPanelStyles}
    >
      <EuiText size="xs" color="subdued">
        <strong>
          <FormattedMessage
            id="xpack.agentBuilderPlatform.attachments.skillDraft.descriptionLabel"
            defaultMessage="Description"
          />
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>

      <EuiHorizontalRule margin="m" />

      <SkillDraftInstructions showFullContent={showFullContent} content={content} />

      <EuiHorizontalRule margin="m" />

      <SkillDraftReferences toolIds={toolIds} referencedContent={referencedContent} />
    </EuiPanel>
  );
};

const SkillDraftInlineContent: React.FC<AttachmentRenderProps<SkillDraftAttachment>> = (props) => (
  <SkillDraftCard {...props} />
);

const SkillDraftCanvasContent: React.FC<AttachmentRenderProps<SkillDraftAttachment>> = (props) => (
  <SkillDraftCard {...props} isCanvas />
);

interface CreateSkillDraftDeps {
  http: HttpStart;
  notifications: CoreStart['notifications'];
  application: CoreStart['application'];
}

/**
 * Factory for the `skill_draft` UI definition.
 *
 * Why a factory: `getActionButtons` runs every render but lives in module
 * scope, so it can't use React hooks. We close over `core.http` /
 * `core.notifications` / `core.application` captured at registration time
 * and use them directly. This mirrors the pattern used by the ESQL and
 * dashboard attachment definitions.
 *
 * The Create button:
 * 1. Disables when the user lacks the `manageSkills` capability.
 * 2. POSTs the captured payload to `/api/agent_builder/skills`.
 * 3. On success, calls the framework-provided `updateOrigin(skillId)` so the
 *    same attachment now references the persisted skill (the card flips to
 *    a "Created" badge and the button disables).
 * 4. On failure, surfaces the agent_builder error message via core toasts.
 */
export const createSkillDraftAttachmentDefinition = ({
  http,
  notifications,
  application,
}: CreateSkillDraftDeps): AttachmentUIDefinition<SkillDraftAttachment> => {
  const canCreate = application.capabilities.agentBuilder?.manageSkills === true;
  const isLatest = ({
    version,
    versionCount,
  }: {
    version: number | undefined;
    versionCount: number | undefined;
  }) => typeof version === 'number' && typeof versionCount === 'number' && version === versionCount;

  return {
    getLabel: (attachment) =>
      attachment.data.name ||
      i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.label', {
        defaultMessage: 'Skill draft',
      }),
    getHeaderIcon: () => 'sparkles',
    getHeaderSubtitle: ({ attachment }) => attachment.data.id,
    getHeaderBadges: ({ attachment, version, versionCount }) => {
      const headerBadges: HeaderBadge[] = [];
      const isCreated = Boolean(attachment.origin);

      if (isCreated) {
        const createdBadge: HeaderBadge = {
          label: i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.createdBadge', {
            defaultMessage: 'Created',
          }),
          color: 'success',
          iconType: 'check',
        };
        headerBadges.push(createdBadge);
        // Created attachments only show created badge
        return headerBadges;
      }

      const draftBadge: HeaderBadge = {
        label: i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.draftBadge', {
          defaultMessage: 'Draft',
        }),
        color: 'hollow',
      };
      headerBadges.push(draftBadge);

      if (isLatest({ version, versionCount })) {
        const latestBadge: HeaderBadge = {
          label: i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.latestBadge', {
            defaultMessage: 'Latest',
          }),
          color: 'primary',
        };
        headerBadges.push(latestBadge);
      }

      return headerBadges;
    },
    renderInlineContent: (props) => <SkillDraftInlineContent {...props} />,
    renderCanvasContent: (props) => <SkillDraftCanvasContent {...props} />,
    getActionButtons: ({
      attachment,
      updateOrigin,
      openCanvas,
      isCanvas,
      version,
      versionCount,
    }) => {
      const isCreated = Boolean(attachment.origin);

      const actionButtons: ActionButton[] = [];
      const createSkill = async () => {
        try {
          const response = await http.post<{ id: string; name: string }>(SKILLS_CREATE_API_PATH, {
            body: JSON.stringify(attachment.data satisfies SkillDraftAttachmentData),
          });
          await updateOrigin(response.id);
          notifications.toasts.addSuccess({
            title: i18n.translate(
              'xpack.agentBuilderPlatform.attachments.skillDraft.createSuccessToast',
              {
                defaultMessage: 'Skill "{skillId}" created.',
                values: { skillId: response.id },
              }
            ),
          });
        } catch (error) {
          notifications.toasts.addError(error as Error, {
            title: i18n.translate(
              'xpack.agentBuilderPlatform.attachments.skillDraft.createErrorToast',
              { defaultMessage: 'Could not create skill from draft' }
            ),
          });
        }
      };

      if (!isCanvas && openCanvas) {
        // As long as the canvas for the skill is not currently open, show the button
        const viewFullSkillButton = {
          label: viewFullSkillLabel,
          icon: 'expand',
          type: ActionButtonType.SECONDARY,
          handler: openCanvas,
        };
        actionButtons.push(viewFullSkillButton);
      }

      if (isLatest({ version, versionCount })) {
        // Only show create button for the latest draft
        const createButton: ActionButton = {
          label: isCreated ? createdLabel : createSkillLabel,
          icon: isCreated ? 'check' : 'save',
          type: ActionButtonType.PRIMARY,
          disabled: isCreated || !canCreate,
          disabledReason: !canCreate ? lackManageSkillsPermissionDescription : undefined,
          handler: createSkill,
        };

        actionButtons.push(createButton);
      }

      return actionButtons;
    },
  };
};

export { SKILL_DRAFT_ATTACHMENT_TYPE };
