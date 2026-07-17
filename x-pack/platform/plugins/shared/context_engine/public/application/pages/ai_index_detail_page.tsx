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
  EuiIcon,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { AiIndexSource } from '../../../common/http_api/ai_indices';
import { EditSourcesModal } from '../components/edit_sources_modal';
import { SourceTypeBadge } from '../components/source_picker';
import { useAiIndex } from '../hooks/use_ai_index';
import { toSourceType } from '../utils/sources';

const SourceRow = ({ source }: { source: AiIndexSource }) => (
  <EuiPanel hasBorder paddingSize="m" data-test-subj="contextAiIndexSourceRow">
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="editorCodeBlock" size="l" aria-hidden={true} />
      </EuiFlexItem>
      {/* minWidth: 0 lets the flex item shrink so long queries truncate instead of overflowing the panel */}
      <EuiFlexItem css={{ minWidth: 0 }}>
        <EuiText size="s" className="eui-textTruncate">
          {i18n.translate('xpack.contextEngine.aiIndexDetail.sources.esqlPrefix', {
            defaultMessage: 'ES|QL · {query}',
            values: { query: source.value },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SourceTypeBadge
          type={toSourceType(source.type)}
          data-test-subj="contextAiIndexSourceType"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const SourcesPanel = ({
  isLoading,
  sources,
  canEdit,
  onEditSources,
}: {
  isLoading: boolean;
  sources: AiIndexSource[];
  canEdit: boolean;
  onEditSources: () => void;
}) => (
  <EuiPanel hasBorder paddingSize="l">
    <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.contextEngine.aiIndexDetail.sources.title', {
              defaultMessage: 'Sources',
            })}
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
          {i18n.translate('xpack.contextEngine.aiIndexDetail.sources.editButton', {
            defaultMessage: 'Edit sources',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiText size="s" color="subdued">
      <p>
        {i18n.translate('xpack.contextEngine.aiIndexDetail.sources.description', {
          defaultMessage:
            'ES|QL views, indices, Connectors and stream signals feeding this AI index.',
        })}
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
            {i18n.translate('xpack.contextEngine.aiIndexDetail.sources.emptyTitle', {
              defaultMessage: 'No sources yet',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate('xpack.contextEngine.aiIndexDetail.sources.emptyBody', {
              defaultMessage: 'Add a source to start building context for this AI index.',
            })}
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

export const AiIndexDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { aiIndex, isLoading, error, refetch } = useAiIndex(id);
  const [isEditingSources, setIsEditingSources] = useState(false);

  if (error) {
    return (
      <KibanaPageTemplate data-test-subj="contextAiIndexDetailPage">
        <KibanaPageTemplate.Section>
          <EuiEmptyPrompt
            iconType="error"
            color="danger"
            data-test-subj="contextAiIndexDetailError"
            title={
              <h2>
                {i18n.translate('xpack.contextEngine.aiIndexDetail.error.title', {
                  defaultMessage: 'Unable to load AI index',
                })}
              </h2>
            }
            body={<p>{error.message}</p>}
          />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  return (
    <KibanaPageTemplate data-test-subj="contextAiIndexDetailPage">
      <KibanaPageTemplate.Header
        pageTitle={
          isLoading ? (
            <EuiSkeletonTitle size="l" data-test-subj="contextAiIndexTitleLoading" />
          ) : (
            aiIndex?.name
          )
        }
      />
      <KibanaPageTemplate.Section>
        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.description.title', {
                defaultMessage: 'Description',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          {isLoading ? (
            <EuiSkeletonText lines={2} />
          ) : (
            <EuiText size="s" color={aiIndex?.description ? undefined : 'subdued'}>
              <p>
                {aiIndex?.description ??
                  i18n.translate('xpack.contextEngine.aiIndexDetail.description.empty', {
                    defaultMessage:
                      'No sources yet — add a source and a summary will be generated automatically.',
                  })}
              </p>
            </EuiText>
          )}
        </EuiPanel>
        <EuiSpacer size="l" />
        <SourcesPanel
          isLoading={isLoading}
          sources={aiIndex?.sources ?? []}
          canEdit={aiIndex !== undefined}
          onEditSources={() => setIsEditingSources(true)}
        />
        <EuiSpacer size="l" />
        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.title', {
                defaultMessage: 'Automations',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.description', {
                defaultMessage:
                  "Automations extract and refresh this AI index's Knowledge Indicators from its sources.",
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiSkeletonRectangle width="100%" height={88} borderRadius="m" />
        </EuiPanel>
      </KibanaPageTemplate.Section>
      {isEditingSources && aiIndex && (
        <EditSourcesModal
          aiIndex={aiIndex}
          onClose={() => setIsEditingSources(false)}
          onSaved={() => {
            setIsEditingSources(false);
            refetch();
          }}
        />
      )}
    </KibanaPageTemplate>
  );
};
