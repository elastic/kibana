/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Investigation, ProposalEnvelope } from '../../../common/investigations';
import { useInvestigation } from '../../hooks/use_investigation';
import { formatRelativeTime, getInvestigationBucketId, getWatchProvenance } from './bucket_utils';

type DetailTabId = 'overview' | 'evidence' | 'actions';

interface DaybreakConversationState {
  daybreak_proposal?: ProposalEnvelope & { confidence?: string | number };
}

interface RawAttachmentVersion {
  version?: number;
  data?: { content?: unknown };
}

interface RawAttachment {
  id?: string;
  description?: string;
  hidden?: boolean;
  current_version?: number;
  versions?: RawAttachmentVersion[];
}

interface InvestigationDetailFlyoutProps {
  investigation: Investigation;
  onClose: () => void;
}

const DETAIL_TABS: Array<{ id: DetailTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'actions', label: 'Actions' },
];

const formatProposalStatus = (status: string | undefined): string => {
  if (!status) {
    return 'Unknown';
  }
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const severityBadgeColor = (
  severity: string | undefined
): 'danger' | 'warning' | 'primary' | 'hollow' => {
  const bucket = getInvestigationBucketId(severity);
  if (bucket === 'contain') {
    return 'danger';
  }
  if (bucket === 'escalate') {
    return 'warning';
  }
  if (bucket === 'investigate') {
    return 'primary';
  }
  return 'hollow';
};

const formatConfidence = (confidence: string | number | undefined): string | undefined => {
  if (confidence === undefined || confidence === null || confidence === '') {
    return undefined;
  }
  const numeric = typeof confidence === 'number' ? confidence : Number.parseFloat(confidence);
  if (Number.isNaN(numeric)) {
    return String(confidence);
  }
  return `${Math.round(numeric * 100)}%`;
};

const getCurrentAttachmentVersion = (attachment: RawAttachment) => {
  const versions = attachment.versions ?? [];
  return (
    versions.find((version) => version.version === attachment.current_version) ??
    versions[versions.length - 1]
  );
};

const formatEvidenceContent = (content: unknown): string => {
  if (typeof content === 'string') {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
};

const extractEvidenceContent = (attachment: RawAttachment): string => {
  const version = getCurrentAttachmentVersion(attachment);
  if (!version?.data) {
    return '';
  }
  const data = version.data as { content?: unknown };
  if (data.content !== undefined) {
    return formatEvidenceContent(data.content);
  }
  return formatEvidenceContent(version.data);
};

export const InvestigationDetailFlyout: React.FC<InvestigationDetailFlyoutProps> = ({
  investigation,
  onClose,
}) => {
  const { services } = useKibana();
  const [selectedTab, setSelectedTab] = useState<DetailTabId>('overview');
  const {
    data: detail,
    isLoading,
    error,
    refetch,
  } = useInvestigation(investigation.conversation_id);

  const proposal = useMemo(() => {
    const state = detail?.state as DaybreakConversationState | undefined;
    return state?.daybreak_proposal;
  }, [detail?.state]);

  const updatedAt = detail?.investigation.updated_at ?? investigation.updated_at;

  const watch = getWatchProvenance(proposal?.source_watch_id ?? investigation.source_watch_id);

  const chatUrl =
    services.application?.getUrlForApp('agent_builder', {
      path: `/conversations/${investigation.conversation_id}`,
    }) ?? '#';

  const renderOverviewTab = () => {
    const summary = proposal?.summary ?? investigation.summary;
    const severity = proposal?.severity ?? investigation.severity;
    const confidence = formatConfidence(proposal?.confidence ?? investigation.confidence);
    const recommendedAction =
      proposal?.recommended_action ?? investigation.recommended_action ?? 'No recommended action.';
    const proposalStatus = formatProposalStatus(proposal?.status ?? investigation.proposal_status);

    return (
      <>
        <EuiTitle size="xs">
          <h3>Assessment</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          {severity ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color={severityBadgeColor(severity)}>{severity.toUpperCase()}</EuiBadge>
            </EuiFlexItem>
          ) : null}
          {confidence ? (
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                Confidence: <strong>{confidence}</strong>
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiMarkdownFormat textSize="s">
          {summary ?? 'No assessment summary available.'}
        </EuiMarkdownFormat>

        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h3>Recommended action</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiCallOut title={recommendedAction} color="warning" iconType="alert" />

        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h3>Proposal status</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBadge color="hollow">{proposalStatus}</EuiBadge>

        <EuiSpacer size="l" />
        <EuiHorizontalRule />
        <EuiDescriptionList type="column" columnWidths={[1, 2]} compressed>
          <EuiDescriptionListTitle>Source watch</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{watch.label}</EuiDescriptionListDescription>
          <EuiDescriptionListTitle>Watch execution</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {proposal?.watch_execution_id ?? investigation.watch_execution_id}
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>Last updated</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {formatRelativeTime(updatedAt)}
            {' · '}
            {new Date(updatedAt).toLocaleString()}
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </>
    );
  };

  const renderEvidenceTab = () => {
    const attachments = (detail?.attachments ?? []) as RawAttachment[];
    const visibleAttachments = attachments.filter((attachment) => !attachment.hidden);

    if (visibleAttachments.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="documents"
          title={<h3>No evidence attachments</h3>}
          body={<p>This conversation has no attachments to display.</p>}
        />
      );
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        {visibleAttachments.map((attachment) => {
          const content = extractEvidenceContent(attachment);
          const title = attachment.description ?? attachment.id;

          return (
            <EuiFlexItem key={attachment.id ?? title}>
              <EuiPanel hasBorder paddingSize="m">
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem>
                    <EuiTitle size="xxs">
                      <h4>{title}</h4>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      source: {watch.label}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  <p>Updated {formatRelativeTime(updatedAt)}</p>
                </EuiText>
                <EuiSpacer size="m" />
                {content ? (
                  <EuiCodeBlock language="json" isCopyable paddingSize="m" overflowHeight={360}>
                    {content}
                  </EuiCodeBlock>
                ) : (
                  <EuiText size="s" color="subdued">
                    <p>No content in this attachment version.</p>
                  </EuiText>
                )}
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
  };

  const renderActionsTab = () => {
    const recommendedAction =
      proposal?.recommended_action ??
      investigation.recommended_action ??
      'Review triage output and escalate if true positive';

    return (
      <>
        <EuiText size="s" color="subdued">
          <p>Available — Gated by Your Permissions</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiPanel hasBorder paddingSize="m">
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{recommendedAction}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                <p>From Daybreak proposal envelope</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" isDisabled aria-label="Execute recommended action (POC)">
                Execute
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel hasBorder paddingSize="m">
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>Convert to Incident</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                <p>POC placeholder — not wired to Cases</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" isDisabled aria-label="Convert to incident (POC)">
                Convert
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </>
    );
  };

  const renderTabContent = () => {
    if (isLoading && !detail) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (error) {
      return (
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          title={<h3>Failed to load investigation</h3>}
          body={<p>Could not fetch investigation detail from the inbox API.</p>}
          actions={
            <EuiButton onClick={() => refetch()} fill>
              Retry
            </EuiButton>
          }
        />
      );
    }

    if (selectedTab === 'evidence') {
      return renderEvidenceTab();
    }
    if (selectedTab === 'actions') {
      return renderActionsTab();
    }
    return renderOverviewTab();
  };

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="investigation-detail-flyout-title"
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="investigation-detail-flyout-title">{investigation.title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span
                    css={css`
                      display: inline-block;
                      width: 8px;
                      height: 8px;
                      border-radius: 50%;
                      background-color: ${watch.color};
                    `}
                    aria-hidden
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <span>WATCHED BY {watch.label}</span>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTabs bottomBorder>
          {DETAIL_TABS.map((tab) => (
            <EuiTab
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              isSelected={selectedTab === tab.id}
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="m" />
        {renderTabContent()}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>Close</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton href={chatUrl} target="_blank" iconType="comment" color="primary" fill>
              Open in Agent Builder
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
