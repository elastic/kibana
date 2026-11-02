/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import React from 'react';
import { useContextEngineBreadcrumbs } from '../../hooks/use_context_engine_breadcrumbs';
import { useLandingHeaderTabs } from '../../hooks/use_landing_header_tabs';
import { useMemoryEnabled } from '../../hooks/use_memory_enabled';
import { ContextEngineLandingHeader } from '../../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../../layout/context_engine_page_template';
import { RememberMemoryPanel } from './remember_memory_panel';
import { SearchMemoryPanel } from './search_memory_panel';
import { SessionEventsPanel } from './session_events_panel';

const pageTitle = i18n.translate('xpack.contextEngine.sessionMemory.title', {
  defaultMessage: 'Session memory',
});

const pageDescription = i18n.translate('xpack.contextEngine.sessionMemory.descriptionText', {
  defaultMessage:
    'Multimodal memory and raw events for agent sessions, stored in Context Engine system data streams.',
});

/**
 * Demo surface for the Context Engine session memory and session events APIs. The app itself is
 * gated by `contextEngine:enabled`; this page is additionally gated by `contextEngine:memoryEnabled`,
 * like every memory capability, and its routes 404 while that setting is off.
 */
export const SessionMemoryPage = () => {
  const isMemoryEnabled = useMemoryEnabled();
  const headerTabs = useLandingHeaderTabs('session_memory');

  useContextEngineBreadcrumbs([{ text: pageTitle }]);

  return (
    <ContextEnginePageTemplate data-test-subj="contextSessionMemoryPage">
      <ContextEngineLandingHeader
        pageTitle={pageTitle}
        description={pageDescription}
        tabs={headerTabs}
      />
      <ContextEnginePageSection>
        {isMemoryEnabled ? (
          <>
            <EuiFlexGroup gutterSize="l" alignItems="flexStart">
              <EuiFlexItem>
                <RememberMemoryPanel />
              </EuiFlexItem>
              <EuiFlexItem>
                <SearchMemoryPanel />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <SessionEventsPanel />
          </>
        ) : (
          <EuiEmptyPrompt
            iconType="lock"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.contextEngine.sessionMemory.disabled.title"
                  defaultMessage="Session memory is turned off"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.contextEngine.sessionMemory.disabled.body"
                  defaultMessage="Turn on the {setting} advanced setting to use session memory."
                  values={{ setting: <code>{CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID}</code> }}
                />
              </p>
            }
            data-test-subj="contextSessionMemoryDisabled"
          />
        )}
      </ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
