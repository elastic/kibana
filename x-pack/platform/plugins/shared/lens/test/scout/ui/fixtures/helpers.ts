/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import type { PageObjects, Locator, ScoutPage } from '@kbn/scout';

type DashboardAndLens = Pick<PageObjects, 'dashboard' | 'lens'>;

export async function openDimensionEditorAndWaitForFlyout(
  { lens }: DashboardAndLens,
  page: ScoutPage,
  dimensionPanel: Locator
): Promise<void> {
  const dimensionButton = dimensionPanel.getByRole('button', { name: /Edit .* configuration/ });

  await expect(dimensionButton).toBeVisible({ timeout: 10000 });
  await dimensionButton.click({ timeout: 15000 });

  await expect
    .poll(
      async () => {
        const backVisible = await lens.getSecondaryFlyoutBackButton().isVisible();
        const contentVisible = await page
          .getByTestId('text-based-languages-field-selection-row')
          .isVisible();
        return backVisible && contentVisible;
      },
      { timeout: 15000 }
    )
    .toBe(true);
}

export async function openInlineEditorAndWaitVisible(
  { dashboard, lens }: DashboardAndLens,
  panelId: string
): Promise<void> {
  await dashboard.openInlineEditor(panelId);
  await expect(lens.getInlineEditor()).toBeVisible();
}

export async function convertToEsqlViaModal({
  pageObjects,
  page,
}: {
  pageObjects: DashboardAndLens;
  page: ScoutPage;
}): Promise<void> {
  const { lens } = pageObjects;

  // Click on the "Conver to ES|QL" button in the in-line editor
  await lens.getConvertToEsqlButton().click();

  // Click on the confirmation button in the modal
  const modal = lens.getConvertToEsqModal();
  await lens.getConvertToEsqModalConfirmButton().click();
  await expect(modal).toBeHidden();

  // Confir that the in-line editor has been updated
  await expect(lens.getConvertToEsqlButton()).toBeHidden();
  await expect(page.getByTestId('ESQLEditor')).toBeVisible();
  await expect(page.getByText('ES|QL Query Results')).toBeVisible();
}
