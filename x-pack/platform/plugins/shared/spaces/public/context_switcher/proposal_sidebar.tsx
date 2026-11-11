/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type { ContextSwitcherVariant } from '@kbn/context-switcher-components';
import { i18n } from '@kbn/i18n';

import { PROJECT_PREVIEWS, setProjectPreviewId, useProjectPreview } from './project_preview';
import type { ProjectPreviewId } from './project_preview';
import { setContextSwitcherProposal, useContextSwitcherProposal } from './proposal';

const TITLE_ID = 'contextSwitcherProposalTitle';

const OPEN_LABEL = i18n.translate('xpack.spaces.contextSwitcher.proposalSidebar.openButton', {
  defaultMessage: 'Context switcher proposals',
});

const TITLE = i18n.translate('xpack.spaces.contextSwitcher.proposalSidebar.title', {
  defaultMessage: 'Context switcher',
});

const ORIGINAL_LABEL = i18n.translate(
  'xpack.spaces.contextSwitcher.proposalSidebar.originalLabel',
  {
    defaultMessage: 'Original',
  }
);

const ORIGINAL_DESCRIPTION = i18n.translate(
  'xpack.spaces.contextSwitcher.proposalSidebar.originalDescription',
  {
    defaultMessage: 'Elastic logo links home. One menu holds the project and the spaces.',
  }
);

const PROPOSAL_ONE_LABEL = i18n.translate(
  'xpack.spaces.contextSwitcher.proposalSidebar.proposalOneLabel',
  {
    defaultMessage: 'Proposal 1',
  }
);

const PROPOSAL_ONE_DESCRIPTION = i18n.translate(
  'xpack.spaces.contextSwitcher.proposalSidebar.proposalOneDescription',
  {
    defaultMessage: 'Elastic logo opens the project menu. The other control lists spaces.',
  }
);

const PROPOSAL_TWO_LABEL = i18n.translate(
  'xpack.spaces.contextSwitcher.proposalSidebar.proposalTwoLabel',
  {
    defaultMessage: 'Proposal 2',
  }
);

const PROPOSAL_TWO_DESCRIPTION = i18n.translate(
  'xpack.spaces.contextSwitcher.proposalSidebar.proposalTwoDescription',
  {
    defaultMessage: 'The space name opens a popover with the project, spaces, and links.',
  }
);

const optionLabel = (label: string, description: string) => (
  <>
    <EuiText size="s">
      <strong>{label}</strong>
    </EuiText>
    <EuiText size="xs" color="subdued">
      {description}
    </EuiText>
  </>
);

const OPTIONS: Array<{ id: ContextSwitcherVariant; label: ReactNode }> = [
  { id: 'original', label: optionLabel(ORIGINAL_LABEL, ORIGINAL_DESCRIPTION) },
  { id: 'proposal1', label: optionLabel(PROPOSAL_ONE_LABEL, PROPOSAL_ONE_DESCRIPTION) },
  { id: 'proposal2', label: optionLabel(PROPOSAL_TWO_LABEL, PROPOSAL_TWO_DESCRIPTION) },
];

const isProposal = (id: string): id is ContextSwitcherVariant =>
  id === 'original' || id === 'proposal1' || id === 'proposal2';

const PREVIEW_TITLE = i18n.translate('xpack.spaces.contextSwitcher.proposalSidebar.previewTitle', {
  defaultMessage: 'Project type',
});

const PREVIEW_LABELS: Record<ProjectPreviewId, string> = {
  security: i18n.translate('xpack.spaces.contextSwitcher.proposalSidebar.previewSecurity', {
    defaultMessage: 'Security',
  }),
  observability: i18n.translate(
    'xpack.spaces.contextSwitcher.proposalSidebar.previewObservability',
    { defaultMessage: 'Observability' }
  ),
  search: i18n.translate('xpack.spaces.contextSwitcher.proposalSidebar.previewSearch', {
    defaultMessage: 'Elasticsearch',
  }),
  vectordb: i18n.translate('xpack.spaces.contextSwitcher.proposalSidebar.previewVector', {
    defaultMessage: 'Vector Database',
  }),
  deployment: i18n.translate('xpack.spaces.contextSwitcher.proposalSidebar.previewDeployment', {
    defaultMessage: 'Hosted deployment',
  }),
};

const PREVIEW_OPTIONS = PROJECT_PREVIEWS.map((preview) => ({
  id: preview.id,
  label: optionLabel(PREVIEW_LABELS[preview.id], preview.description),
}));

const isPreviewId = (id: string): id is ProjectPreviewId =>
  PROJECT_PREVIEWS.some((preview) => preview.id === id);

/**
 * Header icon that opens the context switcher proposal list from the right.
 */
export const ProposalSidebar = () => {
  const proposal = useContextSwitcherProposal();
  const projectPreview = useProjectPreview();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <EuiToolTip content={OPEN_LABEL} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="listBullet"
          display="empty"
          size="m"
          color="text"
          aria-label={OPEN_LABEL}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj="contextSwitcherProposalButton"
        />
      </EuiToolTip>
      {isOpen &&
        createPortal(
          <EuiFlyout
            side="right"
            size="s"
            onClose={() => setIsOpen(false)}
            aria-labelledby={TITLE_ID}
            data-test-subj="contextSwitcherProposalSidebar"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="s">
                <h2 id={TITLE_ID}>{TITLE}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiRadioGroup
                name="contextSwitcherProposal"
                options={OPTIONS}
                idSelected={proposal}
                onChange={(id) => {
                  if (isProposal(id)) {
                    setContextSwitcherProposal(id);
                  }
                }}
                data-test-subj="contextSwitcherProposalOptions"
              />
              {proposal === 'proposal2' && (
                <>
                  <EuiSpacer size="l" />
                  <EuiTitle size="xxs">
                    <h3>{PREVIEW_TITLE}</h3>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <EuiRadioGroup
                    name="contextSwitcherProjectPreview"
                    options={PREVIEW_OPTIONS}
                    idSelected={projectPreview.id}
                    onChange={(id) => {
                      if (isPreviewId(id)) {
                        setProjectPreviewId(id);
                      }
                    }}
                    data-test-subj="contextSwitcherProjectPreviewOptions"
                  />
                </>
              )}
            </EuiFlyoutBody>
          </EuiFlyout>,
          document.body
        )}
    </>
  );
};
