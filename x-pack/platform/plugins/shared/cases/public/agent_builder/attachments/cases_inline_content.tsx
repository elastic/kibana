/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  CASES_ATTACHMENT_TYPE,
  CaseAttachmentData,
  CasesAttachmentData,
} from '../../../common/types/agent_builder/attachment_schemas';
import { SeverityBadge } from './severity_badge';
import { CaseMetaRow } from './case_meta_row';
import {
  buildCasesFilterQuery,
  getAppIdForOwner,
  getCasePathForOwner,
  getCasesListPathForOwner,
  getSharedOwner,
} from './route_helpers';

const MAX_VISIBLE_ROWS = 5;

const i18nStrings = {
  filters: i18n.translate('xpack.cases.agentBuilder.cases.filters', {
    defaultMessage: 'Filters',
  }),
  goToCases: i18n.translate('xpack.cases.agentBuilder.cases.goToCases', {
    defaultMessage: 'Go to cases',
  }),
  header: (count: number) =>
    i18n.translate('xpack.cases.agentBuilder.cases.header', {
      defaultMessage: '{count, plural, one {# Case} other {# Cases}}',
      values: { count },
    }),
  showingFooter: (visible: number, total: number) =>
    i18n.translate('xpack.cases.agentBuilder.cases.showingFooter', {
      defaultMessage: 'Showing {visible} of {total}',
      values: { visible, total },
    }),
};

export type CasesAttachment = Attachment<typeof CASES_ATTACHMENT_TYPE, CasesAttachmentData>;

interface Services {
  application: ApplicationStart;
}

const CaseRow: React.FC<{ data: CaseAttachmentData; application: ApplicationStart }> = ({
  data,
  application,
}) => {
  const idLabel = data.incremental_id ? `#${data.incremental_id}` : `#${data.id}`;
  const goToCase = () => {
    application.navigateToApp(getAppIdForOwner(data.owner), {
      path: getCasePathForOwner(data.owner, data.id),
    });
  };
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="s"
      onClick={goToCase}
      data-test-subj="case-attachment-row"
    >
      <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {idLabel}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h4>{data.title}</h4>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SeverityBadge severity={data.severity} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup gutterSize="xs" responsive={false} css={{ marginTop: 8 }}>
        <EuiFlexItem grow={false}>
          <CaseMetaRow data={data} showAttachments />
        </EuiFlexItem>
      </EuiFlexGroup>

      {data.description && (
        <EuiText
          size="s"
          color="subdued"
          css={{
            marginTop: 8,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {data.description}
        </EuiText>
      )}
    </EuiPanel>
  );
};
CaseRow.displayName = 'CaseRow';

interface InlineContentProps extends AttachmentRenderProps<CasesAttachment> {
  application: ApplicationStart;
}
const InlineContent: React.FC<InlineContentProps> = ({ attachment, application }) => {
  const { data } = attachment;
  const visible = data.cases.slice(0, MAX_VISIBLE_ROWS);
  const sharedOwner = getSharedOwner(data.cases);

  const goToCases = () => {
    application.navigateToApp(getAppIdForOwner(sharedOwner), {
      path: getCasesListPathForOwner(sharedOwner),
    });
  };

  const goToFilteredCases = () => {
    application.navigateToApp(getAppIdForOwner(sharedOwner), {
      path: getCasesListPathForOwner(sharedOwner, buildCasesFilterQuery(data.cases)),
    });
  };

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="cases-attachment-inline">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="casesApp" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{i18nStrings.header(data.total)}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="filter"
            onClick={goToFilteredCases}
            data-test-subj="cases-attachment-filters"
          >
            {i18nStrings.filters}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="popout"
            iconSide="right"
            onClick={goToCases}
            data-test-subj="cases-attachment-go-to-cases"
          >
            {i18nStrings.goToCases}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {visible.map((c: CaseAttachmentData, idx: number) => (
        <React.Fragment key={c.id}>
          <EuiHorizontalRule margin="s" />
          <CaseRow data={c} application={application} />
          {idx === visible.length - 1 && data.total > visible.length && (
            <>
              <EuiHorizontalRule margin="s" />
              <EuiText size="xs" color="subdued" textAlign="center">
                {i18nStrings.showingFooter(visible.length, data.total)}
              </EuiText>
            </>
          )}
        </React.Fragment>
      ))}
    </EuiPanel>
  );
};

InlineContent.displayName = 'InlineContent';

export const createCasesInlineContent = ({ application }: Services) =>
  function render(props: AttachmentRenderProps<CasesAttachment>) {
    return <InlineContent application={application} {...props} />;
  };
