/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormProvider } from 'react-hook-form';
import { labels } from '../../../utils/i18n';
import { useEditSkill } from '../../../hooks/skills/use_edit_skill';
import { useSkillForm } from '../../../hooks/skills/use_skill_form';
import { useTools } from '../../../hooks/tools/use_tools';
import { useNavigation } from '../../../hooks/use_navigation';
import { useKibana } from '../../../hooks/use_kibana';
import { useConnectorSelection } from '../../../hooks/chat/use_connector_selection';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { appPaths } from '../../../utils/app_paths';
import { FLYOUT_WIDTH } from '../common/constants';
import type { SkillFormData } from '../../skills/skill_form_validation';
import { SkillEvalSection } from '../../skills/skill_eval_section';
import { useAesopSuggestions } from '../../skills/use_aesop_suggestions';
import { useSkillBrowserApiTools } from '../../skills/use_skill_browser_api_tools';
import { buildInitialMessage, buildSidebarAttachments } from '../../skills/skill_chat_helpers';
import type { EvalResults } from '../../skills/types';
import { SkillForm } from './skill_form';

interface SkillEditFlyoutProps {
  skillId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export const SkillEditFlyout: React.FC<SkillEditFlyoutProps> = ({ skillId, onClose, onSaved }) => {
  const { createAgentBuilderUrl, navigateToAgentBuilderUrl } = useNavigation();
  const skillLibraryUrl = createAgentBuilderUrl(appPaths.manage.skills);
  const { tools } = useTools();
  const { euiTheme } = useEuiTheme();
  const {
    services: { http, plugins },
  } = useKibana();
  const isEvalsAvailable = Boolean(plugins.evals);
  const { openSidebarConversation } = useAgentBuilderServices();
  const { selectedConnector, defaultConnectorId } = useConnectorSelection();
  const connectorId = selectedConnector ?? defaultConnectorId ?? '';
  const { suggestionsBySkillId } = useAesopSuggestions();

  const form = useSkillForm();
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;

  const { skill, isLoading, isSubmitting, editSkill } = useEditSkill({
    skillId,
    onSuccess: () => {
      onSaved?.();
      onClose();
    },
  });

  useEffect(() => {
    if (skill) {
      reset({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        content: skill.content,
        tool_ids: skill.tool_ids ?? [],
        referenced_content: skill.referenced_content ?? [],
      });
    }
  }, [skill, reset]);

  const toolOptions = useMemo(
    () => tools.map((tool) => ({ label: tool.id, value: tool.id })),
    [tools]
  );

  const aesopSuggestion = skill ? suggestionsBySkillId.get(skill.id) : undefined;

  const browserApiTools = useSkillBrowserApiTools({
    form,
    isReadonly: skill?.readonly ?? false,
    onNavigateToCreate: (data) => {
      navigateToAgentBuilderUrl(
        `${appPaths.skills.new}?prefill=${encodeURIComponent(JSON.stringify(data))}`
      );
    },
  });

  const handleOpenChat = useCallback(
    (evalResults?: EvalResults) => {
      const { name, description, content } = form.getValues();
      const initialMessage = buildInitialMessage({
        isCreateMode: false,
        evalResults,
        skillName: name,
      });

      openSidebarConversation({
        newConversation: true,
        sessionTag: `skill-editor-${skill?.id ?? 'new'}`,
        initialMessage,
        autoSendInitialMessage: !!initialMessage,
        attachments: buildSidebarAttachments({
          skillName: name,
          skillDescription: description,
          skillContent: content,
          isReadonly: skill?.readonly ?? false,
          evalResults,
        }),
        browserApiTools,
      });
    },
    [form, skill?.id, skill?.readonly, openSidebarConversation, browserApiTools]
  );

  // Auto-apply LLM/AESOP-suggested improvements into the form (writable) or
  // navigate to Create with prefill (readonly shared skills).
  const handleApplyImprovement = useCallback(
    (data: { name: string; description: string; content: string }) => {
      if (skill?.readonly) {
        navigateToAgentBuilderUrl(
          `${appPaths.skills.new}?prefill=${encodeURIComponent(JSON.stringify(data))}`
        );
        return;
      }
      form.setValue('name', data.name, { shouldDirty: true });
      form.setValue('description', data.description, { shouldDirty: true });
      form.setValue('content', data.content, { shouldDirty: true });
    },
    [skill?.readonly, form, navigateToAgentBuilderUrl]
  );

  const onSubmit = useCallback(
    async (data: SkillFormData) => {
      await editSkill({
        name: data.name,
        description: data.description,
        content: data.content,
        tool_ids: data.tool_ids,
        referenced_content: data.referenced_content,
      });
    },
    [editSkill]
  );

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <EuiFlyout onClose={onClose} size={FLYOUT_WIDTH} aria-labelledby="skillEditFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="skillEditFlyoutTitle">{labels.agentSkills.editSkillFlyoutTitle}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiLink href={skillLibraryUrl} external>
          {labels.agentSkills.viewSkillLibraryLink}
        </EuiLink>
      </EuiFlyoutHeader>
      <EuiCallOut
        color="warning"
        title={labels.agentSkills.sharedSkillWarning}
        css={css`
          padding-left: ${euiTheme.size.l};
        `}
      />
      <EuiSpacer size="m" />
      <EuiFlyoutBody>
        {isLoading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiLoadingSpinner size="l" />
          </EuiFlexGroup>
        ) : (
          <FormProvider {...form}>
            <EuiForm component="form" onSubmit={handleSubmit(onSubmit)}>
              <SkillForm control={control} toolOptions={toolOptions} readonlySkillId={skillId} />
            </EuiForm>

            {/* Evaluation section — lets the user run skill evals from inside
                the agent builder and auto-apply LLM/AESOP-suggested fixes
                directly into this flyout's form. Gated on the evals plugin
                being available (xpack.evals.enabled=true). */}
            {skill && isEvalsAvailable && (
              <>
                <EuiSpacer size="l" />
                <EuiHorizontalRule margin="none" />
                <EuiSpacer size="m" />
                <EuiAccordion
                  id="skillEditFlyoutEvaluation"
                  initialIsOpen={Boolean(aesopSuggestion)}
                  buttonContent={
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="beaker" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiTitle size="xxs">
                          <h3>
                            {i18n.translate(
                              'xpack.agentBuilder.agentSkills.editFlyout.evaluationTitle',
                              { defaultMessage: 'Evaluation' }
                            )}
                          </h3>
                        </EuiTitle>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                  paddingSize="m"
                >
                  <EuiText size="s" color="subdued">
                    {i18n.translate(
                      'xpack.agentBuilder.agentSkills.editFlyout.evaluationDescription',
                      {
                        defaultMessage:
                          'Generate a dataset, run online evaluations, and auto-apply AI-suggested improvements directly to this skill.',
                      }
                    )}
                  </EuiText>
                  <EuiSpacer size="m" />
                  <SkillEvalSection
                    skillId={skill.id}
                    connectorId={connectorId}
                    http={http}
                    skillName={form.getValues('name')}
                    skillContent={form.getValues('content')}
                    isReadonly={skill.readonly}
                    aesopSuggestion={aesopSuggestion}
                    onOpenChat={handleOpenChat}
                    onApplyImprovement={handleApplyImprovement}
                  />
                </EuiAccordion>
              </>
            )}
          </FormProvider>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>{labels.skills.cancelButtonLabel}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
              disabled={hasErrors || isSubmitting || !isDirty}
            >
              {labels.skills.saveButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
