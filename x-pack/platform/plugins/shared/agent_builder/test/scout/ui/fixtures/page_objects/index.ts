/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';

import { SkillsPage } from './skills_page';
import { SkillFormPage } from './skill_form_page';

export interface AgentBuilderPageObjects extends PageObjects {
  skillsPage: SkillsPage;
  skillFormPage: SkillFormPage;
}

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage
): AgentBuilderPageObjects {
  return {
    ...pageObjects,
    skillsPage: createLazyPageObject(SkillsPage, page),
    skillFormPage: createLazyPageObject(SkillFormPage, page),
  };
}
