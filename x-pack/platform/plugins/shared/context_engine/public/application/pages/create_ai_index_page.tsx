/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiCheckableCard,
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { MAX_AI_INDEX_DESCRIPTION_LENGTH } from '../../../common/constants';
import type { AiIndexType } from '../../../common/http_api/ai_indices';
import { SourcePicker } from '../components/source_picker';
import type { SelectedSource } from '../components/source_picker';
import { useCreateAiIndex } from '../hooks/use_create_ai_index';
import { useNavigation } from '../hooks/use_navigation';
import { ContextEngineSubPageHeader } from '../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';
import { CONTEXT_ENGINE_PATHS, getAiIndexDetailPath } from '../paths';
import { validateAiIndexId } from '../utils/ai_index_dest';

const cancelLabel = i18n.translate('xpack.contextEngine.createAiIndex.cancel', {
  defaultMessage: 'Cancel',
});

const createPageDescription = i18n.translate('xpack.contextEngine.createAiIndex.description', {
  defaultMessage:
    'Start by picking a source to build context from — or skip and add sources later.',
});

const createPageTitle = i18n.translate('xpack.contextEngine.createAiIndex.title', {
  defaultMessage: 'Create AI index',
});

const STORAGE_TYPES: Array<{
  type: AiIndexType;
  badge: string;
  title: string;
  description: string;
}> = [
  {
    type: 'index',
    badge: 'idx',
    title: i18n.translate('xpack.contextEngine.createAiIndex.storageType.index.title', {
      defaultMessage: 'Index',
    }),
    description: i18n.translate('xpack.contextEngine.createAiIndex.storageType.index.description', {
      defaultMessage:
        "Enterprise data — docs, tickets, knowledge bases and other reference context that isn't time-based.",
    }),
  },
  {
    type: 'data_stream',
    badge: 'ds',
    title: i18n.translate('xpack.contextEngine.createAiIndex.storageType.dataStream.title', {
      defaultMessage: 'Data stream',
    }),
    description: i18n.translate(
      'xpack.contextEngine.createAiIndex.storageType.dataStream.description',
      {
        defaultMessage:
          'Observability & security — time-based context for agents (logs, metrics, traces, alerts).',
      }
    ),
  },
];

export const CreateAiIndexPage = () => {
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const { createAiIndex, isCreating } = useCreateAiIndex();
  const [selectedSources, setSelectedSources] = useState<SelectedSource[]>([]);
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [storageType, setStorageType] = useState<AiIndexType>('index');
  const storageGroupName = useGeneratedHtmlId({ prefix: 'aiIndexStorageType' });
  const backHref = createContextEngineUrl(CONTEXT_ENGINE_PATHS.landing);

  const { dest, error: nameError } = validateAiIndexId(storageType, id);
  const destValue = dest?.value;

  const createAndContinue = async () => {
    const created = await createAiIndex({
      id,
      description,
      storageType,
      sources: selectedSources,
    });
    if (created) {
      navigateToContextEngine(getAiIndexDetailPath(created.id));
    }
  };

  return (
    <ContextEnginePageTemplate
      data-test-subj="contextCreateAiIndexPage"
      breadcrumbPageName={createPageTitle}
    >
      <ContextEngineSubPageHeader
        backLabel={cancelLabel}
        backHref={backHref}
        onBackClick={(event) => {
          event.preventDefault();
          navigateToContextEngine(CONTEXT_ENGINE_PATHS.landing);
        }}
        pageTitle={createPageTitle}
        description={createPageDescription}
      />
      <ContextEnginePageSection>
        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.createAiIndex.name.title', {
                defaultMessage: 'Name',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            isInvalid={nameError !== undefined}
            error={nameError}
            helpText={
              destValue ? (
                <FormattedMessage
                  id="xpack.contextEngine.createAiIndex.name.helpText"
                  defaultMessage="Uses {dest} to store pre-computed context"
                  values={{ dest: <EuiCode>{destValue}</EuiCode> }}
                />
              ) : (
                i18n.translate('xpack.contextEngine.createAiIndex.name.helpTextEmpty', {
                  defaultMessage:
                    'Use lowercase letters, numbers, hyphens, and underscores. A backing index is generated from this name.',
                })
              )
            }
          >
            <EuiFieldText
              fullWidth
              value={id}
              isInvalid={nameError !== undefined}
              onChange={(event) => setId(event.target.value)}
              data-test-subj="contextAiIndexNameInput"
              placeholder={i18n.translate('xpack.contextEngine.createAiIndex.name.placeholder', {
                defaultMessage: 'e.g. support-ticket-triage',
              })}
              aria-label={i18n.translate('xpack.contextEngine.createAiIndex.name.ariaLabel', {
                defaultMessage: 'AI index name',
              })}
            />
          </EuiFormRow>
        </EuiPanel>

        <EuiSpacer size="l" />

        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.createAiIndex.description.title', {
                defaultMessage: 'Description',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            helpText={i18n.translate('xpack.contextEngine.createAiIndex.description.helpText', {
              defaultMessage: 'Optional — describe what this AI index is for.',
            })}
          >
            <EuiTextArea
              fullWidth
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={MAX_AI_INDEX_DESCRIPTION_LENGTH}
              data-test-subj="contextAiIndexDescriptionInput"
              placeholder={i18n.translate(
                'xpack.contextEngine.createAiIndex.description.placeholder',
                { defaultMessage: 'Describe what this AI index is for.' }
              )}
              aria-label={i18n.translate(
                'xpack.contextEngine.createAiIndex.description.ariaLabel',
                {
                  defaultMessage: 'AI index description',
                }
              )}
            />
          </EuiFormRow>
        </EuiPanel>

        <EuiSpacer size="l" />

        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.createAiIndex.addSource.title', {
                defaultMessage: 'Sources',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <SourcePicker selectedSources={selectedSources} onChange={setSelectedSources} />
        </EuiPanel>

        <EuiSpacer size="l" />

        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.createAiIndex.storageType.title', {
                defaultMessage: 'Storage type',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.contextEngine.createAiIndex.storageType.description', {
                defaultMessage: 'Choose how this AI index stores pre-computed context.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="column" gutterSize="m">
            {STORAGE_TYPES.map((option) => (
              <EuiFlexItem key={option.type}>
                <EuiCheckableCard
                  id={`${storageGroupName}-${option.type}`}
                  name={storageGroupName}
                  checkableType="radio"
                  checked={storageType === option.type}
                  onChange={() => setStorageType(option.type)}
                  data-test-subj={`contextAiIndexStorageType-${option.type}`}
                  label={
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <strong>{option.title}</strong>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{option.badge}</EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                >
                  <EuiText size="s" color="subdued">
                    {option.description}
                  </EuiText>
                </EuiCheckableCard>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="l" />

        <EuiFlexGroup
          gutterSize="s"
          justifyContent="flexEnd"
          alignItems="center"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="chevronSingleRight"
              iconSide="right"
              data-test-subj="contextCreateAiIndexButton"
              onClick={createAndContinue}
              isLoading={isCreating}
              isDisabled={dest === undefined}
            >
              {i18n.translate('xpack.contextEngine.createAiIndex.continueButton', {
                defaultMessage: 'Create AI index',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
