/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '../../utils/zod_resolver';
import {
  skillFormValidationSchema,
  type SkillFormData,
} from '../../components/skills/skill_form_validation';

const SKILL_FORM_DEFAULT_VALUES: SkillFormData = {
  id: '',
  name: '',
  description: '',
  content: '',
  tool_ids: [],
  referenced_content: [],
};

export const useSkillForm = () => {
  return useForm<SkillFormData>({
    defaultValues: SKILL_FORM_DEFAULT_VALUES,
    resolver: zodResolver(skillFormValidationSchema),
    mode: 'onBlur',
  });
};
