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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextBlockTruncate,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  CASE_ATTACHMENT_TYPE,
  CaseAttachmentData,
} from '../../../common/types/agent_builder/attachment_schemas';
import { SeverityBadge } from './severity_badge';
import { CaseMetaRow } from './case_meta_row';
import { getAppIdForOwner, getCasePathForOwner } from './route_helpers';

const MAX_TAGS = 3;

const i18nStrings = {
  caseHeader: i18n.translate('xpack.cases.agentBuilder.case.header', { defaultMessage: 'Case' }),
  goToCase: i18n.translate('xpack.cases.agentBuilder.case.goToCase', {
    defaultMessage: 'Go to case',
  }),
  idLabel: (id: string | number) =>
    i18n.translate('xpack.cases.agentBuilder.case.idLabel', {
      defaultMessage: 'ID: {id}',
      values: { id },
    }),
  showMore: i18n.translate('xpack.cases.agentBuilder.case.showMore', {
    defaultMessage: 'Show more',
  }),
  showLess: i18n.translate('xpack.cases.agentBuilder.case.showLess', {
    defaultMessage: 'Show less',
  }),
  description: i18n.translate('xpack.cases.agentBuilder.case.description', {
    defaultMessage: 'Description',
  }),
  category: i18n.translate('xpack.cases.agentBuilder.case.category', {
    defaultMessage: 'Category',
  }),
  created: i18n.translate('xpack.cases.agentBuilder.case.created', {
    defaultMessage: 'Created',
  }),
  updated: i18n.translate('xpack.cases.agentBuilder.case.updated', {
    defaultMessage: 'Last updated',
  }),
  observables: i18n.translate('xpack.cases.agentBuilder.case.observables', {
    defaultMessage: 'Observables',
  }),
  connector: i18n.translate('xpack.cases.agentBuilder.case.connector', {
    defaultMessage: 'Connector',
  }),
  none: i18n.translate('xpack.cases.agentBuilder.case.none', {
    defaultMessage: 'None',
  }),
};

const formatDateTime = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <EuiFlexGroup gutterSize="s" responsive={false} alignItems="flexStart">
    <EuiFlexItem grow={false} style={{ minWidth: 110 }}>
      <EuiText size="s">
        <strong>{label}</strong>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiText size="s" color="subdued">
        {value}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
DetailRow.displayName = 'DetailRow';

export type CaseAttachment = Attachment<typeof CASE_ATTACHMENT_TYPE, CaseAttachmentData>;

interface Services {
  application: ApplicationStart;
}

interface InlineContentProps extends AttachmentRenderProps<CaseAttachment> {
  application: ApplicationStart;
}

const CaseInlineContent: React.FC<InlineContentProps> = ({ attachment, application }) => {
  const { data } = attachment;
  const idLabel = data.incremental_id ?? data.id;
  const tags = data.tags ?? [];
  const visibleTags = tags.slice(0, MAX_TAGS);
  const overflowTags = tags.length - visibleTags.length;
  const [expanded, setExpanded] = useState(false);

  const goToCase = () => {
    application.navigateToApp(getAppIdForOwner(data.owner), {
      path: getCasePathForOwner(data.owner, data.id),
    });
  };

  const createdAt = formatDateTime(data.created_at);
  const updatedAt = formatDateTime(data.updated_at);

  const hasObservablesCount =
    data.total_observables !== null && data.total_observables !== undefined;

  const hasDetails =
    Boolean(data.description) ||
    Boolean(data.category) ||
    createdAt !== null ||
    updatedAt !== null ||
    hasObservablesCount ||
    Boolean(data.connector_name);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="case-attachment-inline">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="casesApp" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{i18nStrings.caseHeader}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="popout"
            iconSide="right"
            onClick={goToCase}
            data-test-subj="case-attachment-go-to-case"
          >
            {i18nStrings.goToCase}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="baseline" gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{data.title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18nStrings.idLabel(idLabel)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <SeverityBadge severity={data.severity} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CaseMetaRow data={data} />
        </EuiFlexItem>
        {visibleTags.map((tag: string) => (
          <EuiFlexItem grow={false} key={tag}>
            <EuiBadge color="hollow">{tag}</EuiBadge>
          </EuiFlexItem>
        ))}
        {overflowTags > 0 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{`+${overflowTags}`}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {data.description && !expanded && (
        <>
          <EuiSpacer size="s" />
          <EuiTextBlockTruncate lines={2}>
            <EuiText size="s" color="subdued">
              {data.description}
            </EuiText>
          </EuiTextBlockTruncate>
        </>
      )}

      {expanded && (
        <>
          <EuiHorizontalRule margin="m" />
          <CaseInlineExpandedContent
            attachment={attachment}
            createdAt={createdAt}
            updatedAt={updatedAt}
            hasObservablesCount={hasObservablesCount}
          />
        </>
      )}

      {hasDetails && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="xs"
            iconType={expanded ? 'arrowUp' : 'arrowDown'}
            iconSide="right"
            onClick={() => setExpanded((prev) => !prev)}
            data-test-subj="case-attachment-toggle-details"
          >
            {expanded ? i18nStrings.showLess : i18nStrings.showMore}
          </EuiButtonEmpty>
        </>
      )}
    </EuiPanel>
  );
};
CaseInlineContent.displayName = 'CaseInlineContent';

const CaseInlineExpandedContent: React.FC<
  Pick<InlineContentProps, 'attachment'> & {
    createdAt: string | null;
    updatedAt: string | null;
    hasObservablesCount: boolean;
  }
> = ({ attachment, createdAt, updatedAt, hasObservablesCount }) => {
  const data = attachment.data;
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {data.description && (
        <EuiFlexItem>
          <DetailRow
            label={i18nStrings.description}
            value={<span style={{ whiteSpace: 'pre-wrap' }}>{data.description}</span>}
          />
        </EuiFlexItem>
      )}
      {data.category && (
        <EuiFlexItem>
          <DetailRow label={i18nStrings.category} value={data.category} />
        </EuiFlexItem>
      )}
      {createdAt && (
        <EuiFlexItem>
          <DetailRow label={i18nStrings.created} value={createdAt} />
        </EuiFlexItem>
      )}
      {updatedAt && (
        <EuiFlexItem>
          <DetailRow label={i18nStrings.updated} value={updatedAt} />
        </EuiFlexItem>
      )}
      {hasObservablesCount && (
        <EuiFlexItem>
          <DetailRow label={i18nStrings.observables} value={String(data.total_observables)} />
        </EuiFlexItem>
      )}
      {data.connector_name && (
        <EuiFlexItem>
          <DetailRow label={i18nStrings.connector} value={data.connector_name} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
CaseInlineExpandedContent.displayName = 'CaseInlineExpandedContent';

export const createCaseInlineContent = ({ application }: Services) => {
  const Wrapped: React.FC<AttachmentRenderProps<CaseAttachment>> = (props) => (
    <CaseInlineContent {...props} application={application} />
  );
  Wrapped.displayName = 'CaseInlineContentWrapper';
  return Wrapped;
};
