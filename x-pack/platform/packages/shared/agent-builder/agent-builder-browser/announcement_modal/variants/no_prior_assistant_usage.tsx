/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiModalBody, EuiModalFooter } from '@elastic/eui';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';
import {
  AnnouncementFeatureBulletList,
  AnnouncementReleaseNotesButton,
  announcementModalFooterCss,
} from '../announcement_ui_shared';
import * as i18n from '../translations';
import type { AnnouncementModalVariantProps } from './types';

/**
 * Users with no prior Observability / Security AI Assistant usage in this space.
 * Feature highlights only; no history callout.
 */
export function NoPriorAssistantUsage({ onContinue }: AnnouncementModalVariantProps) {
  return (
    <>
      <EuiModalBody>
        <AnnouncementFeatureBulletList />
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
                data-ebt-element={AGENT_BUILDER_UI_EBT.element.ANNOUNCEMENT_MODAL}
                data-ebt-action={AGENT_BUILDER_UI_EBT.action.announcement.MODAL_CONTINUE}
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
