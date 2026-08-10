/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export const setCodeEditorValueWhenReady = async (page: ScoutPage, value: string) => {
  await expect(page.testSubj.locator('kibanaCodeEditor').locator('textarea')).toBeAttached();
  await expect(async () => {
    await new KibanaCodeEditorWrapper(page).setCodeEditorValue(value);
  }).toPass({ timeout: 30_000 });
};
