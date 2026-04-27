/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalBody,
  EuiModalFooter,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  AnnouncementReleaseNotesButton,
  announcementModalFooterCss,
} from '../announcement_ui_shared';
import * as i18n from '../translations';
import type { AnnouncementModalVariantProps } from './types';

/**
 * Users who already used AI Assistant but need an administrator to revert chat experience.
 */
export function PriorAssistantAdminRevert({ onContinue }: AnnouncementModalVariantProps) {
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
        <EuiText size="s">
          <p>{i18n.INTRO}</p>
        </EuiText>
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
              <li>{i18n.NOTE_CONTACT_ADMIN}</li>
            </ul>
          </EuiCallOut>
        </div>
      </EuiModalBody>
      <EuiModalFooter css={announcementModalFooterCss}>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false}>
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
