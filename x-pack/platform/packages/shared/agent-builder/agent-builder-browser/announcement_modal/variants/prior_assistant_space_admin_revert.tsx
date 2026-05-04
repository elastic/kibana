/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalBody,
  EuiModalFooter,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  AnnouncementFeatureBulletList,
  AnnouncementReleaseNotesButton,
  announcementModalFooterCss,
} from '../announcement_ui_shared';
import * as i18n from '../translations';
import type { AnnouncementModalVariantProps } from './types';

/**
 * Users who already used AI Assistant and can revert the space-level chat
 * experience back to AI Assistant via GenAI Settings.
 */
export function PriorAssistantSpaceAdminRevert({
  onContinue,
  onRevert,
}: AnnouncementModalVariantProps) {
  const { euiTheme } = useEuiTheme();

  const calloutWrapperCss = css`
    margin-top: ${euiTheme.size.l};
  `;

  const notesListCss = css`
    && {
      margin: ${euiTheme.size.s} 0 0;
      margin-left: 0;
      margin-bottom: 0;
      padding-left: 0;
      list-style-position: inside;
    }

    && li + li {
      margin-top: ${euiTheme.size.xs};
    }
  `;

  return (
    <>
      <EuiModalBody>
        <AnnouncementFeatureBulletList />
        <div css={calloutWrapperCss}>
          <EuiCallOut
            announceOnMount={false}
            title={i18n.IMPORTANT_NOTES_TITLE}
            iconType="bulb"
            color="primary"
            size="m"
            data-test-subj="agentBuilderAnnouncementImportantNotes"
          >
            <ul css={notesListCss}>
              <li>{i18n.NOTE_HISTORY_UNTOUCHED}</li>
              <li>{i18n.NOTE_REVERT_IN_SETTINGS}</li>
            </ul>
          </EuiCallOut>
        </div>
      </EuiModalBody>
      <EuiModalFooter css={announcementModalFooterCss}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onRevert}
              data-test-subj="agentBuilderAnnouncementRevertButton"
            >
              {i18n.REVERT_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <AnnouncementReleaseNotesButton />
              <EuiButton
                fill
                onClick={onContinue}
                data-test-subj="agentBuilderAnnouncementContinueButton"
              >
                {i18n.USE_AI_AGENT_BUTTON}
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
}
