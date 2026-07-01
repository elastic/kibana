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
import type { AgentsServiceStartContract } from '@kbn/agent-builder-browser';
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
  AGENTBUILDER_APP_ID,
  SKILLS_API_PATH,
  type CreateSkillResponse,
} from '@kbn/agent-builder-plugin/public';
import {
  SKILL_ATTACHMENT_TYPE,
  type SkillAttachment,
  type SkillAttachmentData,
} from '../../../common/attachments';

const SKILLS_MANAGE_PATH = '/manage/skills';

const INSTRUCTIONS_PREVIEW_MAX_HEIGHT_PX = 240;

const previewButtonLabel = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.skill.previewButtonLabel',
  { defaultMessage: 'Preview' }
);
const editInManagementLabel = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.skill.editInManagementButtonLabel',
  {
    defaultMessage: 'Edit in Management',
  }
);
const createSkillLabel = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.skill.createButtonLabel',
  {
    defaultMessage: 'Create skill',
  }
);
const lackManageSkillsPermissionDescription = i18n.translate(
  'xpack.agentBuilderPlatform.attachments.skill.createDisabledReason',
  {
    defaultMessage: 'You do not have permission to manage skills in this space.',
  }
);

const renderBoldChunks = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

const SkillReferences = ({
  toolIds,
  referencedContent,
}: {
  toolIds: string[];
  referencedContent: SkillReferencedContent[] | undefined;
}) => {
  const hasTools = toolIds.length > 0;
  const hasFiles = Array.isArray(referencedContent) && referencedContent.length > 0;
  if (!hasTools && !hasFiles) {
    return null;
  }
  return (
    <>
      <EuiText size="xs" color="subdued">
        <strong>
          <FormattedMessage
            id="xpack.agentBuilderPlatform.attachments.skill.referencesLabel"
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
                <EuiBadge>
                  <FormattedMessage
                    id="xpack.agentBuilderPlatform.attachments.skill.toolBadge"
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
            {referencedContent.map((file) => (
              <EuiFlexItem grow={false} key={file.relativePath}>
                <EuiBadge>
                  <FormattedMessage
                    id="xpack.agentBuilderPlatform.attachments.skill.fileBadge"
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
const SkillInstructions = ({
  showFullContent,
  content,
}: {
  showFullContent: boolean;
  content: string;
}) => {
  return (
    <>
      <EuiText size="xs" color="subdued">
        <strong>
          {showFullContent ? (
            <FormattedMessage
              id="xpack.agentBuilderPlatform.attachments.skill.instructionsFullLabel"
              defaultMessage="Instructions"
            />
          ) : (
            <FormattedMessage
              id="xpack.agentBuilderPlatform.attachments.skill.instructionsLabel"
              defaultMessage="Instructions preview"
            />
          )}
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiCodeBlock
        language="markdown"
        fontSize="s"
        overflowHeight={showFullContent ? '100%' : INSTRUCTIONS_PREVIEW_MAX_HEIGHT_PX}
        isCopyable={showFullContent}
        css={showFullContent ? fullContentInstructionsStyles : previewInstructionsStyles}
      >
        {content}
      </EuiCodeBlock>
    </>
  );
};

interface SkillCardProps extends AttachmentRenderProps<SkillAttachment> {
  isCanvas?: boolean;
}

const fullContentPanelStyles = css`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const SkillCard: React.FC<SkillCardProps> = ({ attachment, isCanvas }) => {
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
            id="xpack.agentBuilderPlatform.attachments.skill.descriptionLabel"
            defaultMessage="Description"
          />
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>

      <EuiHorizontalRule margin="m" />

      <SkillInstructions showFullContent={showFullContent} content={content} />

      <EuiHorizontalRule margin="m" />

      <SkillReferences toolIds={toolIds} referencedContent={referencedContent} />
    </EuiPanel>
  );
};

const SkillInlineContent: React.FC<AttachmentRenderProps<SkillAttachment>> = (props) => (
  <SkillCard {...props} />
);

const SkillCanvasContent: React.FC<AttachmentRenderProps<SkillAttachment>> = (props) => (
  <SkillCard {...props} isCanvas />
);

interface CreateSkillDeps {
  http: HttpStart;
  notifications: CoreStart['notifications'];
  application: CoreStart['application'];
  agents: AgentsServiceStartContract;
}

/**
 * Factory for the `skill` UI definition.
 *
 * The Create button:
 * 1. Disables when the user lacks the `manageSkills` capability.
 * 2. POSTs the captured payload to `/api/agent_builder/skills`.
 * 3. On success, calls the framework-provided `updateOrigin(skillId)` so the
 *    same attachment now references the persisted skill (the card flips to
 *    a "Created" badge and the button disables).
 * 4. Adds the new skill to the current conversation's agent (`agentId`) so it
 *    is immediately usable; a failure here is reported separately and does not
 *    undo the skill creation.
 * 5. On failure, surfaces the agent_builder error message via core toasts.
 */
export const createSkillAttachmentDefinition = ({
  http,
  notifications,
  application,
  agents,
}: CreateSkillDeps): AttachmentUIDefinition<SkillAttachment> => {
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
      i18n.translate('xpack.agentBuilderPlatform.attachments.skill.label', {
        defaultMessage: 'Skill draft',
      }),
    getHeader: ({ attachment }) => {
      const { version, versionCount } = attachment;
      const badges: HeaderBadge[] = [];
      const isCreated = Boolean(attachment.origin);

      if (isCreated) {
        const createdBadge: HeaderBadge = {
          label: i18n.translate('xpack.agentBuilderPlatform.attachments.skill.createdBadge', {
            defaultMessage: 'Created',
          }),
          color: 'success',
          iconType: 'check',
        };
        badges.push(createdBadge);
        // Created attachments only show created badge
        return { icon: 'sparkles', subtitle: attachment.data.id, badges };
      }

      const draftBadge: HeaderBadge = {
        label: i18n.translate('xpack.agentBuilderPlatform.attachments.skill.draftBadge', {
          defaultMessage: 'Draft',
        }),
      };
      badges.push(draftBadge);

      if (isLatest({ version, versionCount })) {
        const latestBadge: HeaderBadge = {
          label: i18n.translate('xpack.agentBuilderPlatform.attachments.skill.latestBadge', {
            defaultMessage: 'Latest',
          }),
          color: 'primary',
        };
        badges.push(latestBadge);
      }

      return { icon: 'sparkles', subtitle: attachment.data.id, badges };
    },
    renderInlineContent: (props) => <SkillInlineContent {...props} />,
    renderCanvasContent: (props) => <SkillCanvasContent {...props} />,
    getActionButtons: ({ attachment, agentId, updateOrigin, openCanvas, isCanvas }) => {
      const { version, versionCount } = attachment;
      const isCreated = Boolean(attachment.origin);

      const actionButtons: ActionButton[] = [];
      const createSkill = async () => {
        try {
          const response = await http.post<CreateSkillResponse>(SKILLS_API_PATH, {
            body: JSON.stringify(attachment.data satisfies SkillAttachmentData),
          });
          await updateOrigin(response.id);
          if (agentId) {
            try {
              await agents.addSkillToAgent({ agentId, skillId: response.id });
            } catch (error) {
              notifications.toasts.addError(error as Error, {
                title: i18n.translate(
                  'xpack.agentBuilderPlatform.attachments.skill.addToAgentErrorToast',
                  {
                    defaultMessage:
                      'Skill "{skillId}" created, but could not be added to this agent',
                    values: { skillId: response.id },
                  }
                ),
              });
              return;
            }
          }

          notifications.toasts.addSuccess({
            title: i18n.translate(
              'xpack.agentBuilderPlatform.attachments.skill.createSuccessToast',
              {
                defaultMessage: 'Skill "{skillId}" created.',
                values: { skillId: response.id },
              }
            ),
          });
        } catch (error) {
          notifications.toasts.addError(error as Error, {
            title: i18n.translate('xpack.agentBuilderPlatform.attachments.skill.createErrorToast', {
              defaultMessage: 'Could not create skill from draft',
            }),
          });
        }
      };

      if (!isCanvas && openCanvas) {
        // As long as the canvas for the skill is not currently open, show the button
        const previewButton = {
          label: previewButtonLabel,
          icon: 'eye',
          type: ActionButtonType.SECONDARY,
          handler: openCanvas,
        };
        actionButtons.push(previewButton);
      }

      if (isLatest({ version, versionCount })) {
        // Once the draft has been persisted, swap the create button for one that
        // navigates the user to the skill management page for the created skill.
        if (isCreated && attachment.origin) {
          const skillId = attachment.origin;
          const editInManagementButton: ActionButton = {
            label: editInManagementLabel,
            icon: 'pencil',
            type: ActionButtonType.PRIMARY,
            href: application.getUrlForApp(AGENTBUILDER_APP_ID, {
              path: `${SKILLS_MANAGE_PATH}/${skillId}`,
            }),
            openInNewTab: true,
            handler: () => {
              // Do nothing. navigation handled by href
            },
          };
          actionButtons.push(editInManagementButton);
        } else {
          // Only show create button for the latest draft
          const createButton: ActionButton = {
            label: createSkillLabel,
            icon: 'plus',
            type: ActionButtonType.PRIMARY,
            disabled: !canCreate,
            disabledReason: !canCreate ? lackManageSkillsPermissionDescription : undefined,
            handler: createSkill,
          };

          actionButtons.push(createButton);
        }
      }

      return actionButtons;
    },
  };
};

export { SKILL_ATTACHMENT_TYPE };
