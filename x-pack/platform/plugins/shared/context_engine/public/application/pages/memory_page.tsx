/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import React, { useMemo } from 'react';
import { DreamingPanel } from '../components/memory/dreaming_panel';
import { MemoryStoresPanel } from '../components/memory/memory_stores_panel';
import { useContextEngineBreadcrumbs } from '../hooks/use_context_engine_breadcrumbs';
import { useKibana } from '../hooks/use_kibana';
import { useLandingTabs } from '../hooks/use_landing_tabs';
import { useMemoryEnabled } from '../hooks/use_memory_enabled';
import {
  landingDescriptionText,
  landingTitle,
  memoryTabLabel,
} from '../layout/context_engine_landing_labels';
import { ContextEngineLandingHeader } from '../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';

export const MemoryPage = () => {
  const { services } = useKibana();
  const contextEngineLinks = services.docLinks.links.contextEngine;
  const isMemoryEnabled = useMemoryEnabled();
  const tabs = useLandingTabs();

  useContextEngineBreadcrumbs([{ text: memoryTabLabel }]);

  const headerDescription = useMemo(
    () => ({
      text: landingDescriptionText,
      learnMoreUrl: contextEngineLinks.overview,
    }),
    [contextEngineLinks.overview]
  );

  return (
    <ContextEnginePageTemplate data-test-subj="contextMemoryPage">
      <ContextEngineLandingHeader
        pageTitle={landingTitle}
        description={headerDescription}
        docLink={contextEngineLinks.overview}
        tabs={tabs}
      />
      <ContextEnginePageSection>
        {isMemoryEnabled ? (
          <>
            <DreamingPanel />
            <EuiSpacer size="l" />
            <MemoryStoresPanel />
          </>
        ) : (
          <EuiEmptyPrompt
            iconType="sparkles"
            data-test-subj="contextMemoryDisabled"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.contextEngine.memory.disabled.title"
                  defaultMessage="Memory is turned off"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.contextEngine.memory.disabled.body"
                  defaultMessage="Turn on the {setting} advanced setting to use memory."
                  values={{ setting: <code>{CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID}</code> }}
                />
              </p>
            }
          />
        )}
      </ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
