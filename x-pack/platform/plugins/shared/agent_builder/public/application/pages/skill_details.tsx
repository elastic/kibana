/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';
import { EditSkill } from '../components/skills/edit_skill';
import { useSkill } from '../hooks/skills/use_skills';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useNavigation } from '../hooks/use_navigation';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const AgentBuilderSkillDetailsPage = () => {
  const { skillId } = useParams<{ skillId: string }>();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { skill, isLoading } = useSkill({ skillId });

  useBreadcrumb([
    {
      text: labels.skills.title,
      path: appPaths.skills.list,
    },
    {
      text: skillId || '',
      path: appPaths.skills.details({ skillId: skillId || '' }),
    },
  ]);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xxl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!skill) {
    navigateToAgentBuilderUrl(appPaths.skills.list);
    return null;
  }

  return <EditSkill />;
};
