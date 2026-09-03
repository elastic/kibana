/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { MAX_AI_INDEX_DESCRIPTION_LENGTH } from '../../../common/constants';
import { DEFAULT_AI_INDEX_STORAGE_TYPE, useCreateAiIndex } from '../hooks/use_create_ai_index';
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
  defaultMessage: 'Name your AI index. You can set up its sources and automations next.',
});

const createPageTitle = i18n.translate('xpack.contextEngine.createAiIndex.title', {
  defaultMessage: 'Create AI index',
});

export const CreateAiIndexPage = () => {
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const { createAiIndex, isCreating } = useCreateAiIndex();
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const backHref = createContextEngineUrl(CONTEXT_ENGINE_PATHS.landing);

  const { dest, error: nameError } = validateAiIndexId(DEFAULT_AI_INDEX_STORAGE_TYPE, id);
  const destValue = dest?.value;

  const createAndContinue = async () => {
    const created = await createAiIndex({ id, description });
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
