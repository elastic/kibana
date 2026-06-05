/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTextBlockTruncate,
  EuiTitle,
} from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  CASES_ATTACHMENT_TYPE,
  CaseAttachmentData,
  CasesAttachmentData,
} from '../../../common/types/agent_builder/attachment_schemas';
import { SeverityHealth } from '../../components/severity/config';
import { CaseMetaRow } from './case_meta_row';
import { getAppIdForOwner, getCasesListPathForOwner, getCaseUrls } from './route_helpers';
import { CASES_HEADER, GO_TO_CASES, SHOWING_FOOTER } from './translations';
import type { CaseSeverity } from '../../../common/types/domain';

const MAX_VISIBLE_ROWS = 10;
// Approx height of 5 case rows + dividers to create a scroll cutoff
const SCROLL_CUTOFF_PX = 400;

export type CasesAttachment = Attachment<typeof CASES_ATTACHMENT_TYPE, CasesAttachmentData>;

interface Services {
  application: ApplicationStart;
}

const CaseRow: React.FC<{ data: CaseAttachmentData; application: ApplicationStart }> = ({
  data,
  application,
}) => {
  debugger;
  const idLabel = data.incremental_id ? `#${data.incremental_id}` : null;
  const caseUrls = useMemo(() => getCaseUrls({ application, data }), [application, data]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
            {idLabel && (
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {idLabel}
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <EuiLink
                  href={caseUrls.case}
                  target="_blank"
                  data-test-subj="case-attachment-row-title"
                >
                  {data.title}
                </EuiLink>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SeverityHealth severity={data.severity as CaseSeverity} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <CaseMetaRow data={data} caseUrls={caseUrls} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiTextBlockTruncate lines={2}>
          <EuiText size="s" color="subdued">
            {data.description}
          </EuiText>
        </EuiTextBlockTruncate>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
CaseRow.displayName = 'CaseRow';

interface InlineContentProps extends AttachmentRenderProps<CasesAttachment> {
  application: ApplicationStart;
}
const InlineContent: React.FC<InlineContentProps> = ({ attachment, application }) => {
  const { data } = attachment;
  const visible = data.cases.slice(0, MAX_VISIBLE_ROWS);
  const owner = data.cases[0].owner;

  const casesUrl = useMemo(
    () =>
      application.getUrlForApp(getAppIdForOwner(owner), {
        path: getCasesListPathForOwner(owner),
      }),
    [application, owner]
  );

  return (
    <EuiPanel hasBorder paddingSize="xs" data-test-subj="cases-attachment-inline">
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="briefcase" aria-hidden />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{CASES_HEADER(data.total)}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="popout"
                iconSide="right"
                href={casesUrl}
                target="_blank"
                data-test-subj="cases-attachment-go-to-cases"
              >
                {GO_TO_CASES}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            style={{ maxHeight: SCROLL_CUTOFF_PX, overflowY: 'auto' }}
            data-test-subj="cases-attachment-scroll-container"
            gutterSize="l"
            direction="column"
          >
            {visible.map((c: CaseAttachmentData, idx: number) => (
              <EuiFlexItem key={c.id}>
                <CaseRow data={c} application={application} />
                {idx === visible.length - 1 && data.total > visible.length && (
                  <>
                    <EuiHorizontalRule margin="s" />
                    <EuiText size="xs" color="subdued" textAlign="center">
                      {SHOWING_FOOTER(visible.length, data.total)}
                    </EuiText>
                  </>
                )}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

InlineContent.displayName = 'InlineContent';

export const createCasesInlineContent = ({ application }: Services) =>
  function render(props: AttachmentRenderProps<CasesAttachment>) {
    return <InlineContent application={application} {...props} />;
  };
