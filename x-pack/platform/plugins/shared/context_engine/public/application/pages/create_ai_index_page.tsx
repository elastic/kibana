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
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { DEFAULT_AI_INDEX_TYPE, MAX_AI_INDEX_DESCRIPTION_LENGTH } from '../../../common/constants';
import { CONTEXT_ENGINE_UI_EBT } from '../../../common/telemetry';
import { AiIndexDescriptionField } from '../components/ai_index_description_field';
import { TraceSelector, type EditableAiIndexTrace } from '../components/trace_selector';
import { useCreateAiIndex } from '../hooks/use_create_ai_index';
import { useNavigation } from '../hooks/use_navigation';
import { ContextEngineSubPageHeader } from '../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';
import { AI_INDEX_CREATED_LOCATION_STATE } from '../ai_index_created_location_state';
import { CONTEXT_ENGINE_PATHS, getAiIndexDetailPath } from '../paths';
import { validateAiIndexId } from '../utils/ai_index_dest';
import { validateTextInput } from '../utils/validate_text_input';

const cancelLabel = i18n.translate('xpack.contextEngine.createAiIndex.cancel', {
  defaultMessage: 'Cancel',
});

const createPageDescription = i18n.translate('xpack.contextEngine.createAiIndex.description', {
  defaultMessage: "Name your AI index. You'll add sources and automations next.",
});

const createPageTitle = i18n.translate('xpack.contextEngine.createAiIndex.title', {
  defaultMessage: 'Create AI index',
});

export const CreateAiIndexPage = () => {
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const { createAiIndex, isCreating } = useCreateAiIndex();
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [trace, setTrace] = useState<EditableAiIndexTrace | undefined>();
  const backHref = createContextEngineUrl(CONTEXT_ENGINE_PATHS.landing);

  const { dest, error: nameError } = validateAiIndexId(DEFAULT_AI_INDEX_TYPE, id);
  const destValue = dest?.value;
  const descriptionValidation = validateTextInput({
    value: description,
    maxLength: MAX_AI_INDEX_DESCRIPTION_LENGTH,
  });

  const createAndContinue = async () => {
    const created = await createAiIndex({
      id,
      description,
      sources: [],
      trace,
    });
    if (created) {
      navigateToContextEngine(
        getAiIndexDetailPath(created.id),
        undefined,
        AI_INDEX_CREATED_LOCATION_STATE
      );
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
        element={CONTEXT_ENGINE_UI_EBT.element.aiIndexCreatePage}
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
          <AiIndexDescriptionField
            value={description}
            onChange={setDescription}
            error={descriptionValidation.error}
            warning={descriptionValidation.warning}
            data-test-subj="contextAiIndexDescriptionInput"
          />
        </EuiPanel>

        <EuiSpacer size="l" />

        <EuiPanel hasBorder paddingSize="l" data-test-subj="contextCreateAiIndexTracesPanel">
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.createAiIndex.traces.title"
                defaultMessage="Agent traces"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.contextEngine.createAiIndex.traces.description"
                defaultMessage="Traces this AI index learns from. Knowledge Indicators are tuned against the questions agents actually ask."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <TraceSelector
            value={trace}
            onChange={setTrace}
            ebtElement={CONTEXT_ENGINE_UI_EBT.element.aiIndexCreatePageTraceSelector}
          />
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
              isDisabled={dest === undefined || !descriptionValidation.valid}
              {...getEbtProps({
                element: CONTEXT_ENGINE_UI_EBT.element.aiIndexCreatePage,
                action: CONTEXT_ENGINE_UI_EBT.action.aiIndexCreate.CREATE,
              })}
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
