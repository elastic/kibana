/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { AiIndexSource } from '../../../../common/http_api/ai_indices';
import { SourceRow } from './source_row';

interface SourcesPanelProps {
  isLoading: boolean;
  sources: AiIndexSource[];
  canEdit: boolean;
  onEditSources: () => void;
}

export const SourcesPanel = ({ isLoading, sources, canEdit, onEditSources }: SourcesPanelProps) => (
  <EuiPanel hasBorder paddingSize="l">
    <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.sources.title"
              defaultMessage="Sources"
            />
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          iconType="pencil"
          onClick={onEditSources}
          isDisabled={!canEdit}
          data-test-subj="contextEditSourcesButton"
        >
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.sources.editButton"
            defaultMessage="Edit sources"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiText size="s" color="subdued">
      <p>
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.sources.description"
          defaultMessage="ES|QL views, indices, Connectors and stream signals feeding this AI index."
        />
      </p>
    </EuiText>
    <EuiSpacer size="m" />
    {isLoading ? (
      <EuiSkeletonText lines={2} data-test-subj="contextAiIndexSourcesLoading" />
    ) : sources.length === 0 ? (
      <EuiEmptyPrompt
        iconType="editorCodeBlock"
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
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.sources.emptyBody"
              defaultMessage="Add a source to start building context for this AI index."
            />
          </p>
        }
      />
    ) : (
      sources.map((source, index) => (
        <React.Fragment key={`${source.type}-${index}`}>
          <SourceRow source={source} />
          {index < sources.length - 1 && <EuiSpacer size="s" />}
        </React.Fragment>
      ))
    )}
  </EuiPanel>
);
