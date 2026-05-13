/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useCreateSkill } from '../../hooks/skills/use_create_skill';
import { SkillForm, SkillFormMode } from './skill_form';

export const CreateSkill: React.FC = () => {
  const { isSubmitting, createSkill } = useCreateSkill();

  return (
    <SkillForm
      mode={SkillFormMode.Create}
      isLoading={false}
      isSubmitting={isSubmitting}
      onSave={createSkill}
    />
  );
};
