/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { PROPOSALS_UI_CAPABILITY_SHOW } from '@kbn/proposals-common';
import { PROPOSAL_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { ProposalAttachmentPayloadSchema } from '../../../../common/types/domain/attachment/proposal/v2';
import { AttachmentActionType, defineAttachment } from '../../../client/attachment_framework/types';
import type { ProposalViewProps } from './components/proposal_activity';
import * as i18n from './translations';

/** The proposals plugin's feature id, which keys its UI capabilities. */
const PROPOSALS_FEATURE_ID = 'proposals';

const ProposalActivityLazy = React.lazy(() =>
  import('./components/proposal_activity').then(({ ProposalActivity }) => ({
    default: ProposalActivity,
  }))
);

const ProposalTabContentLazy = React.lazy(() =>
  import('./components/proposal_tab_content').then(({ ProposalTabContent }) => ({
    default: ProposalTabContent,
  }))
);

const OpenInvestigationButtonLazy = React.lazy(() =>
  import('./components/open_investigation_button').then(({ OpenInvestigationButton }) => ({
    default: OpenInvestigationButton,
  }))
);

export const getProposalAttachmentType = () =>
  defineAttachment({
    id: PROPOSAL_ATTACHMENT_TYPE,
    schema: ProposalAttachmentPayloadSchema,
    workflowSchema: false,
    // Read rights on proposals. A feature below its minimum license grants no capabilities, so
    // this also hides the section without an Enterprise license.
    isEnabled: ({ capabilities }) =>
      capabilities[PROPOSALS_FEATURE_ID]?.[PROPOSALS_UI_CAPABILITY_SHOW] === true,
    getLabel: () => i18n.PROPOSAL_DISPLAY_NAME,
    getCountLabel: ({ count }) => i18n.PROPOSALS_COUNT(count),
    getIcon: () => 'lock',
    getCreationActivity: ({ attachmentId, metadata }: ProposalViewProps) => ({
      event: i18n.ADDED_PROPOSAL,
      children: ProposalActivityLazy,
      getActions: () => [
        {
          type: AttachmentActionType.CUSTOM as const,
          isPrimary: true,
          render: () => (
            <Suspense fallback={<EuiLoadingSpinner size="m" />}>
              <OpenInvestigationButtonLazy proposalId={attachmentId} />
            </Suspense>
          ),
        },
      ],
      deleteSuccessToast: i18n.REMOVE_PROPOSAL_SUCCESS_TOAST(metadata?.title ?? ''),
    }),
    getRemovalActivity: () => ({ event: i18n.REMOVED_PROPOSAL }),
    getAttachmentList: () => ({
      children: ProposalTabContentLazy,
    }),
  });
