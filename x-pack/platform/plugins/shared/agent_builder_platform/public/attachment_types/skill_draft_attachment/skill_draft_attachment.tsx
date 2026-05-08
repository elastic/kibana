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
  useEuiTheme,
} from '@elastic/eui';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import {
  ActionButtonType,
  type AttachmentRenderProps,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
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

/**
 * Trim a multi-line markdown body to a preview suitable for the inline card.
 * The agent's `content` can be hundreds of lines; we show the first chunk
 * inline and let the user open the full skill in the editor (or scroll the
 * code block) for the rest.
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

/** Badge label and color for the created vs. draft states. */
const getDraftBadge = (isCreated: boolean): { label: string; color: 'success' | 'primary' } => {
  if (isCreated) {
    return {
      label: i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.createdBadge', {
        defaultMessage: 'Created',
      }),
      color: 'success',
    };
  }
  return {
    label: i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.draftBadge', {
      defaultMessage: 'Draft',
    }),
    color: 'primary',
  };
};

type SkillDraftCardProps = AttachmentRenderProps<SkillDraftAttachment>;

const SkillDraftCard: React.FC<SkillDraftCardProps> = ({ attachment }) => {
  const { euiTheme } = useEuiTheme();
  const data = attachment.data;
  const isCreated = Boolean(attachment.origin);
  const { preview, truncated } = previewContent(data.content);

  const hasTools = data.tool_ids.length > 0;
  const hasFiles = (data.referenced_content?.length ?? 0) > 0;
  const hasFooter = hasTools || hasFiles;

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              font-weight: ${euiTheme.font.weight.bold};
            `}
          >
            {i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.descriptionLabel', {
              defaultMessage: 'Description',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <p>{data.description}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="m" />

      <EuiText
        size="xs"
        color="subdued"
        css={css`
          font-weight: ${euiTheme.font.weight.bold};
        `}
      >
        {i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.instructionsLabel', {
          defaultMessage: 'Instructions preview',
        })}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiCodeBlock
        language="markdown"
        fontSize="s"
        overflowHeight={240}
        css={css`
          width: 100%;
          & pre {
            margin-block-end: 0;
          }
        `}
      >
        {preview}
      </EuiCodeBlock>
      {truncated && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.previewTruncated', {
              defaultMessage:
                'Preview truncated to the first {lineCount} lines. The full instructions will be saved when you click Create.',
              values: { lineCount: PREVIEW_MAX_LINES },
            })}
          </EuiText>
        </>
      )}

      {isCreated && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.agentBuilderPlatform.attachments.skillDraft.mentionNudge', {
                defaultMessage: 'Use /{skillId} to reference this skill in future conversations.',
                values: { skillId: data.id },
              })}
            </p>
          </EuiText>
        </>
      )}

      {hasFooter && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            {hasTools && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="xs"
                      color="subdued"
                      css={css`
                        font-weight: ${euiTheme.font.weight.bold};
                      `}
                    >
                      {i18n.translate(
                        'xpack.agentBuilderPlatform.attachments.skillDraft.toolsLabel',
                        { defaultMessage: 'Tools' }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                  {data.tool_ids.map((toolId) => (
                    <EuiFlexItem grow={false} key={toolId}>
                      <EuiBadge>{toolId}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}

            {hasFiles && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="xs"
                      color="subdued"
                      css={css`
                        font-weight: ${euiTheme.font.weight.bold};
                      `}
                    >
                      {i18n.translate(
                        'xpack.agentBuilderPlatform.attachments.skillDraft.filesLabel',
                        { defaultMessage: 'Referenced files' }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                  {data.referenced_content?.map((ref) => (
                    <EuiFlexItem grow={false} key={ref.relativePath}>
                      <EuiBadge>{ref.name}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
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
  return <SkillDraftCard {...props} />;
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
 *    same attachment now references the persisted skill. The card badge flips
 *    to "Created", the button becomes a navigable "View skill" link, and a
 *    /-mention nudge appears below the card.
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
    getIcon: () => 'sparkles',
    getHeaderBadge: (attachment) => {
      const isCreated = Boolean(attachment.origin);
      const badge = getDraftBadge(isCreated);
      return (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{attachment.data.id}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={badge.color}>{badge.label}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    renderInlineContent: (props) => <SkillDraftInlineContent {...props} />,
    getActionButtons: ({ attachment, updateOrigin }) => {
      const isCreated = Boolean(attachment.origin);

      if (isCreated) {
        return [
          {
            label: i18n.translate(
              'xpack.agentBuilderPlatform.attachments.skillDraft.viewSkillButtonLabel',
              { defaultMessage: 'View skill' }
            ),
            icon: 'popout',
            type: ActionButtonType.PRIMARY,
            handler: () => {
              application.navigateToApp('agentBuilder', {
                path: `/manage/skills/${attachment.origin}`,
              });
            },
          },
        ];
      }

      return [
        {
          label: i18n.translate(
            'xpack.agentBuilderPlatform.attachments.skillDraft.createButtonLabel',
            { defaultMessage: 'Create skill' }
          ),
          icon: 'save',
          type: ActionButtonType.PRIMARY,
          disabled: !canCreate,
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
              const response = await http.post<{ id: string; name: string }>(
                SKILLS_CREATE_API_PATH,
                {
                  body: JSON.stringify(attachment.data satisfies SkillDraftAttachmentData),
                }
              );
              await updateOrigin(response.id);
            } catch (error) {
              notifications.toasts.addError(error as Error, {
                title: i18n.translate(
                  'xpack.agentBuilderPlatform.attachments.skillDraft.createErrorToast',
                  { defaultMessage: 'Could not create skill from draft' }
                ),
              });
            }
          },
        },
      ];
    },
  };
};

export { SKILL_DRAFT_ATTACHMENT_TYPE };
