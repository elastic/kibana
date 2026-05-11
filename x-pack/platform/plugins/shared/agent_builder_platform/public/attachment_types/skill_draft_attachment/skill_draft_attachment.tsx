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
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiNotificationBadge,
  useEuiTheme,
} from '@elastic/eui';
import type { CoreStart, HttpStart } from '@kbn/core/public';
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

const SkillDraftBadges = ({
  hasMultipleVersions,
  isLatestVersion,
  isCreated,
  skillId,
}: {
  hasMultipleVersions: boolean;
  isLatestVersion: boolean;
  isCreated: boolean;
  skillId: string;
}) => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{skillId}</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color={isCreated ? 'success' : 'primary'}>
          {isCreated ? (
            <FormattedMessage
              id="xpack.agentBuilderPlatform.attachments.skillDraft.createdBadge"
              defaultMessage="Created"
            />
          ) : (
            <FormattedMessage
              id="xpack.agentBuilderPlatform.attachments.skillDraft.draftBadge"
              defaultMessage="Draft"
            />
          )}
        </EuiBadge>
      </EuiFlexItem>
      {hasMultipleVersions && (
        <EuiFlexItem grow={false}>
          <EuiBadge color={isLatestVersion ? 'accent' : 'warning'}>
            {isLatestVersion ? (
              <FormattedMessage
                id="xpack.agentBuilderPlatform.attachments.skillDraft.latestVersionBadge"
                defaultMessage="Latest"
              />
            ) : (
              <FormattedMessage
                id="xpack.agentBuilderPlatform.attachments.skillDraft.outdatedVersionBadge"
                defaultMessage="Outdated"
              />
            )}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const SkillDraftToolsAndReferencedFiles = ({
  toolIds,
  referencedContent,
}: {
  toolIds: string[];
  referencedContent: SkillReferencedContent[] | undefined;
}) => {
  return (
    <>
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.agentBuilderPlatform.attachments.skillDraft.toolsLabel"
                  defaultMessage="Tools"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="subdued">{toolIds.length}</EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.agentBuilderPlatform.attachments.skillDraft.filesLabel"
                  defaultMessage="Referenced files"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="subdued">
                {referencedContent?.length ?? 0}
              </EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {toolIds.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
            {toolIds.map((toolId) => (
              <EuiFlexItem grow={false} key={toolId}>
                <EuiBadge color="hollow">{toolId}</EuiBadge>
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
  isCreated: boolean;
  isCanvas?: boolean;
}

const fullContentPanelStyles = css`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const SkillDraftCard: React.FC<SkillDraftCardProps> = ({
  attachment,
  isCreated,
  isCanvas,
  version,
  versionCount,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    content,
    description,
    id: skillId,
    name: skillName,
    tool_ids: toolIds,
    referenced_content: referencedContent,
  } = attachment.data;
  const showFullContent = isCanvas === true;
  const hasMultipleVersions = (versionCount ?? 0) > 1;
  const isLatestVersion = version !== undefined && version === versionCount;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="m"
      css={showFullContent && fullContentPanelStyles}
    >
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="bullseye" size="l" color={euiTheme.colors.primary} aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{skillName}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SkillDraftBadges
                skillId={skillId}
                isCreated={isCreated}
                hasMultipleVersions={hasMultipleVersions}
                isLatestVersion={isLatestVersion}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>

      <EuiHorizontalRule margin="m" />

      <SkillDraftToolsAndReferencedFiles toolIds={toolIds} referencedContent={referencedContent} />

      <EuiSpacer size="m" />

      <SkillDraftInstructions showFullContent={showFullContent} content={content} />
    </EuiPanel>
  );
};

/**
 * Provider container that gives the inline content access to the live
 * `origin` field on the attachment so the badge updates after Create
 * without remounting the renderer. We pass `isCreated` through the
 * standard render props pipeline (the attachment object itself updates
 * when `updateOrigin` invalidates the conversation).
 */
const SkillDraftInlineContent: React.FC<AttachmentRenderProps<SkillDraftAttachment>> = (props) => {
  const isCreated = Boolean(props.attachment.origin);
  return <SkillDraftCard {...props} isCreated={isCreated} />;
};

const SkillDraftCanvasContent: React.FC<AttachmentRenderProps<SkillDraftAttachment>> = (props) => {
  const isCreated = Boolean(props.attachment.origin);
  return <SkillDraftCard {...props} isCreated={isCreated} isCanvas />;
};

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

  return {
    getLabel: (attachment) =>
      attachment.data.name ||
      i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.label', {
        defaultMessage: 'Skill draft',
      }),
    getIcon: () => 'bullseye',
    renderInlineContent: (props) => <SkillDraftInlineContent {...props} />,
    renderCanvasContent: (props) => <SkillDraftCanvasContent {...props} />,
    getActionButtons: ({ attachment, updateOrigin, openCanvas, isCanvas }) => {
      const isCreated = Boolean(attachment.origin);
      const actionButtons: ActionButton[] = [];

      if (!isCanvas && openCanvas) {
        // As long as the canvas for the skill is not currently open, show the button
        const viewFullSkillButton = {
          label: i18n.translate(
            'xpack.agentBuilderPlatform.attachments.skillDraft.viewFullSkillButtonLabel',
            { defaultMessage: 'View full skill' }
          ),
          icon: 'expand',
          type: ActionButtonType.SECONDARY,
          handler: () => {
            openCanvas();
          },
        };
        actionButtons.push(viewFullSkillButton);
      }

      const createButton: ActionButton = {
        label: isCreated
          ? i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.createdButtonLabel', {
              defaultMessage: 'Created',
            })
          : i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.createButtonLabel', {
              defaultMessage: 'Create skill',
            }),
        icon: isCreated ? 'check' : 'save',
        type: ActionButtonType.PRIMARY,
        disabled: isCreated || !canCreate,
        disabledReason: !canCreate
          ? i18n.translate(
              'xpack.agentBuilderPlatform.attachments.skillDraft.createDisabledReason',
              {
                defaultMessage: 'You do not have permission to manage skills in this space.',
              }
            )
          : undefined,
        handler: async () => {
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
        },
      };

      actionButtons.push(createButton);

      return actionButtons;
    },
  };
};

export { SKILL_DRAFT_ATTACHMENT_TYPE };
