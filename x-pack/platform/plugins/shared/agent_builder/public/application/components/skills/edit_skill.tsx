/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useParams } from 'react-router-dom';
import { useEditSkill } from '../../hooks/skills/use_edit_skill';
import { appPaths } from '../../utils/app_paths';
import { SkillForm, SkillFormMode } from './skill_form';

export const EditSkill: React.FC = () => {
  const { skillId } = useParams<{ skillId: string }>();
  const { skill, isSubmitting, isLoading, editSkill } = useEditSkill({ skillId });

  if (!skillId) {
    return <Redirect to={appPaths.skills.list} />;
  }

  if (skill?.readonly) {
    return <SkillForm mode={SkillFormMode.View} skill={skill} isLoading={isLoading} />;
  }

  return (
    <SkillForm
      mode={SkillFormMode.Edit}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      skill={skill}
      onSave={editSkill}
    />
  );
};
