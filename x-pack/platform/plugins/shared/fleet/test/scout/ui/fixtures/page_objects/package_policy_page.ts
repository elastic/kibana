/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import {
  POLICY_EDITOR,
  CREATE_PACKAGE_POLICY_SAVE_BTN,
  ADD_PACKAGE_POLICY_BTN,
} from '../../common/selectors';

export class PackagePolicyPage {
  constructor(private readonly page: ScoutPage) {}

  getPolicyNameInput() {
    return this.page.testSubj.locator(POLICY_EDITOR.POLICY_NAME_INPUT);
  }

  getDatasetSelect() {
    return this.page.testSubj.locator(POLICY_EDITOR.DATASET_SELECT);
  }

  getAgentPolicySelect() {
    return this.page.testSubj.locator(POLICY_EDITOR.AGENT_POLICY_SELECT);
  }

  getSaveButton() {
    return this.page.testSubj.locator(CREATE_PACKAGE_POLICY_SAVE_BTN);
  }

  getAddPackagePolicyButton() {
    return this.page.testSubj.locator(ADD_PACKAGE_POLICY_BTN);
  }

  getPackagePolicyLink(name: string) {
    return this.page.getByRole('link', { name });
  }

  getInspectPipelinesButton() {
    return this.page.testSubj.locator(POLICY_EDITOR.INSPECT_PIPELINES_BTN);
  }

  getEditMappingsButton() {
    return this.page.testSubj.locator(POLICY_EDITOR.EDIT_MAPPINGS_BTN);
  }

  getCreateMappingsButton() {
    return this.page.testSubj.locator(POLICY_EDITOR.CREATE_MAPPINGS_BTN);
  }
}
