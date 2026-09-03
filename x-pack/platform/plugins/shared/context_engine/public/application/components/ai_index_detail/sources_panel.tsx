/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AiButton } from '@kbn/shared-ux-ai-components';
import React, { useMemo } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useDataConnectors } from '../../hooks/use_data_connectors';
import { useSuggestAutomation } from '../../hooks/use_suggest_automation';
import { toSourceType } from '../../utils/sources';
import { getSourceDisplay } from '../source_display';
import { SourceRow } from '../source_row';

interface SourcesPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  canEdit: boolean;
  onEditSources: () => void;
  onSaved: () => void;
  isManaged: boolean;
}

export const SourcesPanel = ({
  isLoading,
  aiIndex,
  canEdit,
  onEditSources,
  onSaved,
  isManaged,
}: SourcesPanelProps) => {
  const sources = useMemo(() => aiIndex?.sources ?? [], [aiIndex]);
  const hasConnectorSources = useMemo(
    () => sources.some((source) => source.type === 'connector'),
    [sources]
  );
  const { connectorNameById, connectorActionTypeById } = useDataConnectors({
    enabled: hasConnectorSources,
  });
  const { canSuggest, startGuidedSetup } = useSuggestAutomation({ aiIndex, isManaged, onSaved });

  // Offered alongside Edit, where the other panels put their assistant action, rather than inside
  // the empty state. Only while the index has no sources: "set this up" is an answer to an index
  // that is not set up, and once it is, Edit is the way to change what is there.
  const showGuidedSetup = canSuggest && !isLoading && sources.length === 0;

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        {/* minWidth: 0 keeps the description from running underneath the actions column */}
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.sources.title"
                defaultMessage="Sources"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.sources.description"
                defaultMessage="Data feeding this AI index. Add a source to refresh context and suggestions."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        {!isManaged && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {showGuidedSetup && (
                <EuiFlexItem grow={false}>
                  <AiButton
                    size="s"
                    iconType="productAgent"
                    onClick={startGuidedSetup}
                    data-test-subj="contextSetUpAiIndexButton"
                  >
                    {i18n.translate('xpack.contextEngine.aiIndexDetail.sources.setUpButton', {
                      defaultMessage: 'Help me set this up',
                    })}
                  </AiButton>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="pencil"
                  onClick={onEditSources}
                  isDisabled={!canEdit}
                  data-test-subj="contextEditSourcesButton"
                >
                  <FormattedMessage
                    id="xpack.contextEngine.aiIndexDetail.sources.editButton"
                    defaultMessage="Edit"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {isLoading ? (
        <EuiSkeletonText lines={2} data-test-subj="contextAiIndexSourcesLoading" />
      ) : sources.length === 0 && isManaged ? (
        <EuiText size="s" color="subdued" data-test-subj="contextAiIndexSourcesEmpty">
          <p>
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.sources.emptyManaged"
              defaultMessage="This AI index has no sources."
            />
          </p>
        </EuiText>
      ) : sources.length === 0 ? (
        <EuiEmptyPrompt
          iconType="database"
          titleSize="xs"
          data-test-subj="contextAiIndexSourcesEmpty"
          title={
            <h3>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.sources.emptyTitle"
                defaultMessage="No sources yet"
              />
            </h3>
          }
          body={
            <p>
              {canSuggest ? (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.emptyWithAssistant"
                  defaultMessage="Describe the data you want agents to answer from, and the assistant works out which sources to draw on and builds the automations that fill this index."
                />
              ) : (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.sources.empty"
                  defaultMessage="No sources yet. Add a source to start building context for this AI index."
                />
              )}
            </p>
          }
        />
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {sources.map((source) => {
            const { label, typeLabel, icon, content } = getSourceDisplay(
              toSourceType(source.type),
              source.value,
              { connectorNameById, connectorActionTypeById }
            );
            return (
              <EuiFlexItem key={`${source.type}-${source.value}`}>
                <SourceRow
                  label={label}
                  typeLabel={typeLabel}
                  icon={icon}
                  data-test-subj="contextAiIndexSourceRow"
                >
                  {content}
                </SourceRow>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
