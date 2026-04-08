/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CreateSkill } from '../components/skills/create_skill';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const AgentBuilderSkillCreatePage = () => {
  useBreadcrumb([
    {
      text: labels.skills.title,
      path: appPaths.skills.list,
    },
    {
      text: labels.skills.newSkillTitle,
      path: appPaths.skills.new,
    },
  ]);
  return <CreateSkill />;
};
