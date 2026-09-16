/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { AiIndexSource } from '../../../../common/http_api/ai_indices';
import { useDataConnectors } from '../../hooks/use_data_connectors';
import { toSourceType } from '../../utils/sources';
import { getSourceDisplay } from '../source_display';
import { SourceRow } from '../source_row';

interface SourcesPanelProps {
  isLoading: boolean;
  sources: AiIndexSource[];
  canEdit: boolean;
  onEditSources: () => void;
  isManaged: boolean;
}

export const SourcesPanel = ({
  isLoading,
  sources,
  canEdit,
  onEditSources,
  isManaged,
}: SourcesPanelProps) => {
  const hasConnectorSources = useMemo(
    () => sources.some((source) => source.type === 'connector'),
    [sources]
  );
  const { connectorNameById, connectorActionTypeById } = useDataConnectors({
    enabled: hasConnectorSources,
  });
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
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {isLoading ? (
        <EuiSkeletonText lines={2} data-test-subj="contextAiIndexSourcesLoading" />
      ) : sources.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="contextAiIndexSourcesEmpty">
          <p>
            {isManaged ? (
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.sources.emptyManaged"
                defaultMessage="This AI index has no sources."
              />
            ) : (
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.sources.empty"
                defaultMessage="No sources yet. Add a source to start building context for this AI index."
              />
            )}
          </p>
        </EuiText>
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
