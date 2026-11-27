/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { MarkdownRenderer } from '../../../components/markdown_editor';
import type { InvestigationRecord, ProposalItem } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { getHttpErrorMessage } from '../../hooks';
import { ICONS } from '../../icons';
import { ActorAvatar } from '../shared/actor_badge';
import { useProposalActions } from './use_proposal_actions';
import * as i18n from './translations';

type AgentReply =
  | { status: 'idle' }
  | { status: 'waiting' }
  | { status: 'replied'; message: string }
  | { status: 'failed'; message: string };

export interface ModifyModalProps {
  record: InvestigationRecord;
  proposal: ProposalItem;
  agentAvailable: boolean;
  onClose: () => void;
  /** Approves the revised proposal: the card closes this modal and asks for the approval. */
  onApproveVersion: (proposal: ProposalItem) => void;
  onRejectVersion: (proposal: ProposalItem) => void;
}

/**
 * Revises a proposal: the person edits the proposal or says what should change, the proposal
 * becomes the next version, and the agent gets the request in the investigation conversation.
 */
export const ModifyModal: React.FC<ModifyModalProps> = ({
  record,
  proposal,
  agentAvailable,
  onClose,
  onApproveVersion,
  onRejectVersion,
}) => {
  const titleId = useGeneratedHtmlId();
  const { revise, askAgent, isUpdating } = useProposalActions(record.id);
  const { proposal: details } = proposal;
  const [title, setTitle] = useState(proposal.title);
  const [effect, setEffect] = useState(details.effect);
  const [scopeValues, setScopeValues] = useState(details.scope.map(([, value]) => value));
  const [request, setRequest] = useState('');
  const [showError, setShowError] = useState(false);
  const [revisedTo, setRevisedTo] = useState<number | null>(null);
  const [reply, setReply] = useState<AgentReply>({ status: 'idle' });

  const agentName = record.agent_name ?? i18n.THE_AGENT;
  const conversationId = record.conversation_id ?? null;
  const canAskAgent = agentAvailable && record.ai_enabled && conversationId !== null;
  const suggestions = details.suggestions ?? [];
  const isMissingRequest = request.trim().length === 0;
  const isMissingTitle = title.trim().length === 0;

  const submit = async () => {
    if (isMissingRequest || isMissingTitle) {
      setShowError(true);
      return;
    }
    const requestText = request.trim();
    const nextRevision = await revise(proposal, {
      title: title.trim(),
      effect: effect.trim(),
      scope: details.scope.map(([key], index): [string, string] => [key, scopeValues[index] ?? '']),
      request: requestText,
    });
    if (nextRevision === null) {
      return;
    }
    setRevisedTo(nextRevision);
    setRequest('');
    setShowError(false);

    if (canAskAgent && conversationId) {
      setReply({ status: 'waiting' });
      try {
        const message = await askAgent(conversationId, proposal, requestText);
        setReply({ status: 'replied', message });
      } catch (error) {
        setReply({ status: 'failed', message: getHttpErrorMessage(error) });
      }
    }
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={680}
      data-test-subj="investigationModifyModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {canAskAgent ? i18n.MODIFY_WITH_AGENT(agentName) : i18n.MODIFY_MODAL_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiPanel color="subdued" hasShadow={false} paddingSize="s">
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{proposal.title}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="investigationModifyVersion">
                {i18n.CURRENT_VERSION(details.revision)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued">
            {details.effect}
          </EuiText>
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          {canAskAgent ? i18n.MODIFY_INTRO_AGENT(agentName) : i18n.MODIFY_INTRO}
        </EuiText>
        {suggestions.length > 0 ? (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup
              gutterSize="s"
              responsive={false}
              wrap
              data-test-subj="investigationModifySuggestions"
            >
              {suggestions.map((suggestion) => (
                <EuiFlexItem grow={false} key={suggestion}>
                  <EuiBadge
                    color="hollow"
                    onClick={() => setRequest(suggestion)}
                    onClickAriaLabel={i18n.USE_SUGGESTION(suggestion)}
                  >
                    {suggestion}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.REQUEST_LABEL}
          isInvalid={showError && isMissingRequest}
          error={i18n.REQUEST_REQUIRED}
          fullWidth
        >
          <EuiTextArea
            fullWidth
            rows={2}
            maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
            placeholder={i18n.REQUEST_PLACEHOLDER}
            value={request}
            isInvalid={showError && isMissingRequest}
            onChange={(event) => setRequest(event.target.value)}
            data-test-subj="investigationModifyRequest"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.FIELD_TITLE}
          isInvalid={showError && isMissingTitle}
          error={i18n.TITLE_REQUIRED}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            maxLength={INVESTIGATION_LIMITS.maxTitleLength}
            value={title}
            isInvalid={showError && isMissingTitle}
            onChange={(event) => setTitle(event.target.value)}
            data-test-subj="investigationModifyTitle"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow label={i18n.FIELD_EFFECT} fullWidth>
          <EuiTextArea
            fullWidth
            rows={2}
            maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
            value={effect}
            onChange={(event) => setEffect(event.target.value)}
            data-test-subj="investigationModifyEffect"
          />
        </EuiFormRow>
        {details.scope.map(([key], index) => (
          <React.Fragment key={key}>
            <EuiSpacer size="s" />
            <EuiFormRow label={key} fullWidth>
              <EuiFieldText
                fullWidth
                compressed
                maxLength={1024}
                value={scopeValues[index] ?? ''}
                onChange={(event) =>
                  setScopeValues((values) =>
                    values.map((value, valueIndex) =>
                      valueIndex === index ? event.target.value : value
                    )
                  )
                }
                data-test-subj={`investigationModifyScope-${index}`}
              />
            </EuiFormRow>
          </React.Fragment>
        ))}
        {revisedTo !== null ? (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              size="s"
              color="success"
              iconType={ICONS.check}
              title={i18n.REVISED_CALLOUT(revisedTo)}
              text={<p>{i18n.STILL_NEEDS_APPROVAL}</p>}
              actionProps={{
                primary: {
                  children: i18n.APPROVE_THIS_VERSION,
                  onClick: () => onApproveVersion(proposal),
                  'data-test-subj': 'investigationModifyApproveVersion',
                },
                secondary: {
                  children: i18n.REJECT_PROPOSAL,
                  onClick: () => onRejectVersion(proposal),
                  'data-test-subj': 'investigationModifyRejectVersion',
                },
              }}
              data-test-subj="investigationModifyRevised"
            />
          </>
        ) : null}
        {reply.status !== 'idle' ? (
          <>
            <EuiSpacer size="m" />
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="s"
              data-test-subj="investigationModifyReply"
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <ActorAvatar
                    actor={{ type: 'agent', id: record.agent_id ?? 'agent', name: agentName }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>{agentName}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              {reply.status === 'waiting' ? (
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="m" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" color="subdued">
                      {i18n.AGENT_WORKING(agentName)}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : null}
              {reply.status === 'replied' ? (
                <MarkdownRenderer textSize="s">
                  {reply.message || i18n.AGENT_NO_REPLY}
                </MarkdownRenderer>
              ) : null}
              {reply.status === 'failed' ? (
                <EuiCallOut
                  announceOnMount
                  size="s"
                  color="warning"
                  title={i18n.AGENT_FAILED(agentName)}
                >
                  <EuiText size="s">{reply.message}</EuiText>
                </EuiCallOut>
              ) : null}
            </EuiPanel>
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="investigationModifyClose">
          {i18n.CLOSE}
        </EuiButtonEmpty>
        <EuiButton
          fill
          iconType={canAskAgent ? ICONS.send : ICONS.edit}
          isLoading={isUpdating || reply.status === 'waiting'}
          onClick={() => void submit()}
          data-test-subj="investigationModifySubmit"
        >
          {i18n.REVISE_PROPOSAL}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
ModifyModal.displayName = 'ModifyModal';
