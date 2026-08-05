/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { TryInConsoleButton } from '@kbn/try-in-console';
import React, { useState } from 'react';
import { DEFAULT_AI_INDEX_DATA_STREAM } from '../../../common/constants';
import { SourcePicker } from '../components/source_picker';
import type { SelectedSource } from '../components/source_picker';
import { useCreateAiIndex } from '../hooks/use_create_ai_index';
import { useKibana } from '../hooks/use_kibana';
import { useNavigation } from '../hooks/use_navigation';
import { getAiIndexDetailPath } from '../paths';

const CREATE_AI_INDEX_DEST_REQUEST = `# Create an index template so the data stream gets created with the right settings
PUT _index_template/ai-index-ds-template
{
  "index_patterns": [".ai-index-ds-*"],
  "data_stream": {},
  "priority": 500
}

# Create the backing data stream used by the "Continue" button below
PUT _data_stream/${DEFAULT_AI_INDEX_DATA_STREAM}`;

export const CreateAiIndexPage = () => {
  const {
    services: { application, share, console: consolePlugin },
  } = useKibana();
  const { navigateToContextEngine } = useNavigation();
  const { createAiIndex, isCreating } = useCreateAiIndex();
  const [selectedSources, setSelectedSources] = useState<SelectedSource[]>([]);

  const createAndContinue = async () => {
    const created = await createAiIndex(selectedSources);
    if (created) {
      navigateToContextEngine(getAiIndexDetailPath(created.id));
    }
  };

  return (
    <KibanaPageTemplate data-test-subj="contextCreateAiIndexPage">
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.contextEngine.createAiIndex.title', {
          defaultMessage: 'Create AI index',
        })}
        description={i18n.translate('xpack.contextEngine.createAiIndex.description', {
          defaultMessage:
            'Start by picking a source to build context from or skip and add sources later.',
        })}
      />
      <KibanaPageTemplate.Section>
        <EuiPanel hasBorder paddingSize="l">
          <EuiFlexGroup alignItems="flexStart" gutterSize="m">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>
                  <FormattedMessage
                    id="xpack.contextEngine.createAiIndex.addSource.title"
                    defaultMessage="Add a source"
                  />
                </h2>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.contextEngine.createAiIndex.addSource.description"
                    defaultMessage="Pick what this AI index should build context from. You can add more than one."
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <TryInConsoleButton
                    type="emptyButton"
                    iconType="plusInCircle"
                    request={CREATE_AI_INDEX_DEST_REQUEST}
                    application={application}
                    sharePlugin={share}
                    consolePlugin={consolePlugin}
                    data-test-subj="contextCreateAiIndexDestButton"
                    content={i18n.translate('xpack.contextEngine.createAiIndex.createDestButton', {
                      defaultMessage: 'Create AI index dest',
                    })}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconType="arrowRight"
                    iconSide="right"
                    data-test-subj="contextContinueButton"
                    onClick={createAndContinue}
                    isLoading={isCreating}
                    isDisabled={selectedSources.length === 0}
                  >
                    <FormattedMessage
                      id="xpack.contextEngine.createAiIndex.continueButton"
                      defaultMessage="Continue"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <SourcePicker selectedSources={selectedSources} onChange={setSelectedSources} />
        </EuiPanel>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
