/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
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
  EuiLink,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormProvider } from 'react-hook-form';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import { useCreateSkill } from '../../../hooks/skills/use_create_skill';
import { useSkillForm } from '../../../hooks/skills/use_skill_form';
import { useTools } from '../../../hooks/tools/use_tools';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { FLYOUT_WIDTH } from '../common/constants';
import { SkillForm } from './skill_form';

interface SkillCreateFlyoutProps {
  onClose: () => void;
  onSkillCreated?: (skill: PublicSkillDefinition) => void;
}

export const SkillCreateFlyout: React.FC<SkillCreateFlyoutProps> = ({
  onClose,
  onSkillCreated,
}) => {
  const { createAgentBuilderUrl } = useNavigation();
  const skillLibraryUrl = createAgentBuilderUrl(appPaths.manage.skills);
  const { tools } = useTools();
  const { euiTheme } = useEuiTheme();

  const form = useSkillForm();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const { isSubmitting, createSkill } = useCreateSkill({
    onSuccess: (response) => {
      onSkillCreated?.(response);
      onClose();
    },
  });

  const toolOptions = useMemo(
    () => tools.map((tool) => ({ label: tool.id, value: tool.id })),
    [tools]
  );

  const onSubmit = useCallback(
    async (data: {
      id: string;
      name: string;
      description: string;
      content: string;
      tool_ids: string[];
    }) => {
      await createSkill({
        id: data.id,
        name: data.name,
        description: data.description,
        content: data.content,
        tool_ids: data.tool_ids,
      });
    },
    [createSkill]
  );

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <EuiFlyout onClose={onClose} size={FLYOUT_WIDTH} aria-labelledby="skillCreateFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="skillCreateFlyoutTitle">{labels.agentSkills.createSkillFlyoutTitle}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiLink href={skillLibraryUrl} target="_blank">
          {labels.agentSkills.viewSkillLibraryLink}
        </EuiLink>
      </EuiFlyoutHeader>
      <EuiCallOut
        color="primary"
        title={labels.agentSkills.newSkillLibraryInfo}
        css={css`
          padding-left: ${euiTheme.size.l};
        `}
      />
      <EuiSpacer size="m" />
      <EuiFlyoutBody>
        <FormProvider {...form}>
          <EuiForm component="form" onSubmit={handleSubmit(onSubmit)}>
            <SkillForm control={control} toolOptions={toolOptions} />
          </EuiForm>
        </FormProvider>
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
              disabled={hasErrors || isSubmitting}
            >
              {labels.skills.saveButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
