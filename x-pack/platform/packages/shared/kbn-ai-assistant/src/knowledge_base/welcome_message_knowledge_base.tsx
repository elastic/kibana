/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/public';
import usePrevious from 'react-use/lib/usePrevious';
import { UseKnowledgeBaseResult } from '../hooks';
import { KnowledgeBaseInstallationStatusPanel } from './knowledge_base_installation_status_panel';
import { SettingUpKnowledgeBase } from './setting_up_knowledge_base';
import { InspectKnowledgeBasePopover } from './inspect_knowlegde_base_popover';

export function WelcomeMessageKnowledgeBase({
  knowledgeBase,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
}) {
  const prevIsInstalling = usePrevious(knowledgeBase.isInstalling || knowledgeBase.isPolling);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  useEffect(() => {
    if (prevIsInstalling) {
      setShowSuccessBanner(true);
    }
  }, [knowledgeBase.isInstalling, prevIsInstalling]);

  if (knowledgeBase.isInstalling) {
    return (
      <>
        <SettingUpKnowledgeBase />
        <InspectKnowledgeBasePopover knowledgeBase={knowledgeBase} />
      </>
    );
  }

  if (knowledgeBase.status.value?.kbState === KnowledgeBaseState.READY) {
    return showSuccessBanner ? (
      <div>
        <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText
              color="subdued"
              size="s"
              data-test-subj="observabilityAiAssistantKnowledgeBaseInstalled"
            >
              {i18n.translate(
                'xpack.aiAssistant.welcomeMessage.knowledgeBaseSuccessfullyInstalledLabel',
                { defaultMessage: 'Knowledge base successfully installed' }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    ) : null;
  }

  return <KnowledgeBaseInstallationStatusPanel knowledgeBase={knowledgeBase} />;
}
