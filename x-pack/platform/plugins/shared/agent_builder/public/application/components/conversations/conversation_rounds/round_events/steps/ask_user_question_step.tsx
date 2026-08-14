/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import type { AskUserQuestionStep } from '@kbn/agent-builder-common/chat/conversation';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
} from '@kbn/agent-builder-common/attachments';
import { StepLayout } from '../step_layout';
import { AskUserQuestionFlyout } from '../flyouts/ask_user_question_flyout';
import { RoundAttachmentReferences } from '../../round_attachment_references';

interface AskUserQuestionStepEventProps {
  step: AskUserQuestionStep;
  conversationAttachments?: VersionedAttachment[];
}

export const AskUserQuestionStepEvent: React.FC<AskUserQuestionStepEventProps> = ({
  step,
  conversationAttachments,
}) => {
  const [isFlyoutOpen, { on: openFlyout, off: closeFlyout }] = useBoolean();

  if (!step.answers) return null;

  const answered = step.answers.filter((a) => !a.skipped).length;
  const skipped = step.answers.filter((a) => a.skipped).length;
  const uploadedFileRefs: AttachmentVersionRef[] = step.answers.flatMap((answer) =>
    answer.attachment_id
      ? [
          {
            attachment_id: answer.attachment_id,
            version: 1,
            operation: ATTACHMENT_REF_OPERATION.created,
            actor: ATTACHMENT_REF_ACTOR.user,
          },
        ]
      : []
  );

  const labelText =
    skipped > 0
      ? i18n.translate('xpack.agentBuilder.roundEvents.askUserQuestionStep.labelWithSkipped', {
          defaultMessage: 'Clarification • {answered} answered, {skipped} skipped',
          values: { answered, skipped },
        })
      : i18n.translate('xpack.agentBuilder.roundEvents.askUserQuestionStep.label', {
          defaultMessage: 'Clarification • {answered} answered',
          values: { answered },
        });

  return (
    <>
      <StepLayout
        label={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="if" size="m" color="inherit" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="inherit">
                <p>{labelText}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        isExpandable={false}
        onClick={openFlyout}
      />
      <AskUserQuestionFlyout
        isOpen={isFlyoutOpen}
        onClose={closeFlyout}
        questions={step.questions}
        answers={step.answers}
      />
      {uploadedFileRefs.length > 0 && (
        <RoundAttachmentReferences
          attachmentRefs={uploadedFileRefs}
          conversationAttachments={conversationAttachments}
          actorFilter={[ATTACHMENT_REF_ACTOR.user]}
        />
      )}
    </>
  );
};
