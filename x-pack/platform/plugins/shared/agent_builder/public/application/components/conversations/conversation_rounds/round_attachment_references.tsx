/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useGeneratedHtmlId,
  type EuiFlexGroupProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  Attachment,
  AttachmentVersionRef,
  AttachmentRefActor,
  AttachmentRefOperation,
  UnknownAttachment,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
  estimateTokens,
  getVersion,
  hashContent,
} from '@kbn/agent-builder-common/attachments';
import { css } from '@emotion/react';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { InlineAttachmentWithActions } from './round_response/attachments/inline_attachment_with_actions';
import { RoundUserAttachmentItem } from './round_user_attachment_item';

export type RoundAttachmentReferencesVariant = 'compact' | 'standard';

export interface RoundAttachmentReferencesProps {
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  fallbackAttachments?: Attachment[];
  actorFilter?: AttachmentRefActor[];
  justifyContent?: EuiFlexGroupProps['justifyContent'];
  conversationId?: string;
  /**
   * `compact` — slim rows under the user message (icon, title, expand only).
   * `standard` — full inline attachment cards (agent / system references).
   */
  variant?: RoundAttachmentReferencesVariant;
}

interface ResolvedReference {
  attachment: VersionedAttachment;
  version: number;
  operation: AttachmentRefOperation;
  actor: AttachmentRefActor;
}

const labels = {
  attachments: i18n.translate('xpack.agentBuilder.roundAttachmentReferences.attachments', {
    defaultMessage: 'Attachments',
  }),
  showAttachments: (count: number) =>
    i18n.translate('xpack.agentBuilder.roundAttachmentReferences.showAttachments', {
      defaultMessage: 'Show attachments ({count})',
      values: { count },
    }),
  hideAttachments: i18n.translate('xpack.agentBuilder.roundAttachmentReferences.hideAttachments', {
    defaultMessage: 'Hide attachments',
  }),
};

const attachmentsBlockStyles = css`
  width: 100%;
  max-width: 100%;

  .euiAccordion__button {
    width: 100%;
  }
`;

/**
 * Wrapper styles for the accordion itself — gives the whole
 * "Show attachments / Hide attachments" block 8px breathing room
 * before the round content below it (agent thinking row, agent
 * response, …) so the pills row never sits flush against the next
 * piece of UI.
 */
const accordionWrapperStyles = css`
  width: 100%;
  max-width: 100%;
  padding-bottom: 8px;
`;

const attachmentListItemStyles = css`
  width: 100%;
  max-width: 100%;
`;

const resolveOperation = (
  refOperation: AttachmentRefOperation | undefined,
  version: number
): AttachmentRefOperation => {
  if (refOperation) {
    return refOperation;
  }

  return version === 1 ? ATTACHMENT_REF_OPERATION.created : ATTACHMENT_REF_OPERATION.updated;
};

const resolveActor = (actor: AttachmentRefActor | undefined): AttachmentRefActor => {
  return actor ?? ATTACHMENT_REF_ACTOR.system;
};

const buildFallbackVersionedAttachments = (attachments: Attachment[]): VersionedAttachment[] => {
  const now = new Date().toISOString();
  return attachments.map((attachment, index) => ({
    id: attachment.id ?? `pending-${index}`,
    type: attachment.type,
    versions: [
      {
        version: 1,
        data: attachment.data,
        created_at: now,
        content_hash: hashContent(attachment.data),
        estimated_tokens: estimateTokens(attachment.data),
      },
    ],
    current_version: 1,
    active: true,
    hidden: attachment.hidden,
  }));
};

const toInlineAttachment = (
  versioned: VersionedAttachment,
  version: number
): UnknownAttachment | null => {
  const versionData = getVersion(versioned, version);
  if (!versionData) {
    return null;
  }

  return {
    id: versioned.id,
    type: versioned.type,
    data: versionData.data,
    hidden: versioned.hidden,
    origin: versioned.origin,
  };
};

interface RoundAttachmentReferenceItemProps {
  resolvedReference: ResolvedReference;
  conversationId: string;
  variant: RoundAttachmentReferencesVariant;
}

const RoundAttachmentReferenceItem: React.FC<RoundAttachmentReferenceItemProps> = ({
  resolvedReference,
  conversationId,
  variant,
}) => {
  const { attachmentsService } = useAgentBuilderServices();
  const inlineAttachment = toInlineAttachment(
    resolvedReference.attachment,
    resolvedReference.version
  );

  if (!inlineAttachment) {
    return null;
  }

  if (!attachmentsService.getAttachmentUiDefinition(inlineAttachment.type)) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <RoundUserAttachmentItem
        attachment={inlineAttachment}
        version={resolvedReference.version}
      />
    );
  }

  return (
    <InlineAttachmentWithActions
      attachment={inlineAttachment}
      attachmentsService={attachmentsService}
      isSidebar={false}
      conversationId={conversationId}
      version={resolvedReference.version}
    />
  );
};

export const RoundAttachmentReferences: React.FC<RoundAttachmentReferencesProps> = ({
  attachmentRefs,
  conversationAttachments,
  fallbackAttachments,
  actorFilter,
  justifyContent = 'flexStart',
  conversationId,
  variant = 'standard',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const accordionId = useGeneratedHtmlId({ prefix: 'agentBuilderRoundAttachmentRefs' });
  const isRightAligned = justifyContent === 'flexEnd';

  const resolvedReferences = useMemo((): ResolvedReference[] => {
    const fallbackVersioned = fallbackAttachments?.length
      ? buildFallbackVersionedAttachments(fallbackAttachments)
      : [];
    const effectiveAttachments = conversationAttachments?.length
      ? [
          ...conversationAttachments,
          ...fallbackVersioned.filter((attachment) =>
            conversationAttachments.every((existing) => existing.id !== attachment.id)
          ),
        ]
      : fallbackVersioned;

    const refs =
      attachmentRefs?.length || !fallbackAttachments?.length
        ? attachmentRefs
        : fallbackAttachments.map((attachment, index) => ({
            attachment_id: attachment.id ?? `pending-${index}`,
            version: 1,
            operation: ATTACHMENT_REF_OPERATION.created,
            actor: ATTACHMENT_REF_ACTOR.user,
          }));

    if (!refs?.length || !effectiveAttachments.length) {
      return [];
    }

    const attachmentMap = new Map<string, VersionedAttachment>();
    for (const attachment of effectiveAttachments) {
      if (attachment.hidden) {
        continue;
      }
      attachmentMap.set(attachment.id, attachment);
    }

    const resolved: ResolvedReference[] = [];
    for (const ref of refs) {
      const attachment = attachmentMap.get(ref.attachment_id);
      if (!attachment) {
        continue;
      }

      const actor = resolveActor(ref.actor);
      if (actorFilter?.length && !actorFilter.includes(actor)) {
        continue;
      }

      const operation = resolveOperation(ref.operation, ref.version);
      if (operation === ATTACHMENT_REF_OPERATION.read) {
        continue;
      }

      resolved.push({
        attachment,
        version: ref.version,
        operation,
        actor,
      });
    }

    return resolved;
  }, [attachmentRefs, conversationAttachments, fallbackAttachments, actorFilter]);

  if (resolvedReferences.length === 0 || !conversationId) {
    return null;
  }

  const attachmentCount = resolvedReferences.length;
  const accordionLabel = isExpanded
    ? labels.hideAttachments
    : labels.showAttachments(attachmentCount);

  const accordionButtonStyles = css`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    max-width: 100%;
    ${isRightAligned ? 'justify-content: flex-end;' : ''}
  `;

  /*
   * Compact variant (user-message attachments) lays the items out as a
   * wrapping row of pills — so attachments flow like @mentions, with
   * as many fitting per line as the row's width allows. Standard
   * variant (agent / system references) keeps the original stacked
   * column of full inline-attachment cards.
   */
  const isCompact = variant === 'compact';
  const listDirection = isCompact ? 'row' : 'column';
  const listGutter = isCompact ? 'xs' : 's';
  const listWrap = isCompact;
  const listAlignItems = isCompact ? 'center' : 'stretch';

  return (
    <EuiFlexGroup
      gutterSize="s"
      direction="column"
      responsive={false}
      justifyContent={justifyContent}
      alignItems="stretch"
      css={attachmentsBlockStyles}
      aria-label={labels.attachments}
      data-test-subj="agentBuilderRoundAttachmentReferences"
    >
      <EuiFlexItem grow={false} css={attachmentsBlockStyles}>
        <EuiAccordion
          id={accordionId}
          arrowDisplay="none"
          forceState={isExpanded ? 'open' : 'closed'}
          onToggle={setIsExpanded}
          data-test-subj="agentBuilderRoundAttachmentReferencesAccordion"
          css={accordionWrapperStyles}
          buttonContent={
            <EuiText color="subdued" size="s">
              <p css={accordionButtonStyles}>
                <EuiIcon type="paperClip" size="m" />
                <EuiText size="s">{accordionLabel}</EuiText>
              </p>
            </EuiText>
          }
        >
          <EuiFlexGroup
            gutterSize={listGutter}
            direction={listDirection}
            responsive={false}
            wrap={listWrap}
            alignItems={listAlignItems}
            css={attachmentsBlockStyles}
            role="list"
            aria-label={labels.attachments}
            data-test-subj="agentBuilderRoundAttachmentReferencesList"
          >
            {resolvedReferences.map((resolvedReference) => (
              <EuiFlexItem
                grow={false}
                key={`${resolvedReference.attachment.id}-v${resolvedReference.version}-${resolvedReference.actor}-${resolvedReference.operation}`}
                /*
                 * Standard cards span the row's full width; pills
                 * size to their content so the wrapping flow works.
                 */
                css={isCompact ? undefined : attachmentListItemStyles}
              >
                <RoundAttachmentReferenceItem
                  resolvedReference={resolvedReference}
                  conversationId={conversationId}
                  variant={variant}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiAccordion>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
