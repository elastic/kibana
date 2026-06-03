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
) {
  const dimensionButton = dimensionPanel.getByRole('button', { name: /Edit .* configuration/ });
  await dimensionButton.click();

  // Confirm that the secondary flyout is opened
  await expect(lens.getSecondaryFlyoutBackButton()).toBeVisible();
  await expect(page.getByTestId('text-based-languages-field-selection-row')).toBeVisible();
}

export async function openInlineEditorAndWaitVisible(
  { dashboard, lens }: DashboardAndLens,
  panelId: string
) {
  await dashboard.openInlineEditor(panelId);
  await expect(lens.getInlineEditor()).toBeVisible();
}

export async function applyLensInlineEditorAndWaitClosed({ lens }: Pick<PageObjects, 'lens'>) {
  await lens.getApplyFlyoutButton().click();
  await expect(lens.getInlineEditor()).toBeHidden();
}

export async function cancelLensInlineEditorAndWaitClosed({ lens }: Pick<PageObjects, 'lens'>) {
  await lens.getCancelFlyoutButton().click();
  await expect(lens.getInlineEditor()).toBeHidden();
}

export async function convertToEsqlViaModal({
  pageObjects,
  page,
}: {
  pageObjects: DashboardAndLens;
  page: ScoutPage;
}) {
  const { lens } = pageObjects;

  // Click on the "Conver to ES|QL" button in the in-line editor
  await lens.getConvertToEsqlButton().click();

  // Click on the confirmation button in the modal
  const modal = lens.getConvertToEsqModal();
  await lens.getConvertToEsqModalConfirmButton().click();
  await expect(modal).toBeHidden();

  // Confirm that the in-line editor has been updated
  await expect(lens.getConvertToEsqlButton()).toBeHidden();
  await expect(page.getByTestId('ESQLEditor')).toBeVisible();
  await expect(page.getByText('ES|QL Query Results')).toBeVisible();
}
