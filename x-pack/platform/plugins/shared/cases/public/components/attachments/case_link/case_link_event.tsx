/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CaseLinkAttachmentMetadata } from '../../../../common/types/domain/attachment/case_link/v1';
import type { UnifiedReferenceAttachmentViewProps } from '../../../client/attachment_framework/types';
import { useCaseViewNavigation } from '../../../common/navigation';
import { bulkGetCases } from '../../../containers/agentic_api';
import * as i18n from './translations';

export type CaseLinkViewProps = UnifiedReferenceAttachmentViewProps<
  CaseLinkAttachmentMetadata,
  string
>;

/**
 * "linked case #N". The stored title is never shown: the other case is read as the viewer, and one
 * they can't see is named only as "a case you don't have access to".
 */
export const CaseLinkEvent: React.FC<CaseLinkViewProps> = ({ attachmentId }) => {
  const { getCaseViewUrl, navigateToCaseView } = useCaseViewNavigation();
  const { data, isLoading } = useQuery({
    queryKey: ['cases', 'caseLink', attachmentId],
    queryFn: ({ signal }) => bulkGetCases({ ids: [attachmentId] }, signal),
    staleTime: 60_000,
  });
  const target = data?.cases[0];

  const linkedCase = (link: React.ReactNode) => (
    <FormattedMessage
      id="xpack.cases.userActions.linkedCase"
      defaultMessage="linked case {link}"
      values={{ link }}
    />
  );
  if (isLoading) return linkedCase('…');
  if (!target) return linkedCase(i18n.INACCESSIBLE_CASE);

  const label =
    typeof target.incremental_id === 'number'
      ? `${i18n.CASE_NUMBER(target.incremental_id)} ${target.title}`
      : target.title;
  return linkedCase(
    <EuiLink
      href={getCaseViewUrl({ detailName: target.id })}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        navigateToCaseView({ detailName: target.id });
      }}
      data-test-subj="case-link-activity-target"
    >
      {label}
    </EuiLink>
  );
};
CaseLinkEvent.displayName = 'CaseLinkEvent';
