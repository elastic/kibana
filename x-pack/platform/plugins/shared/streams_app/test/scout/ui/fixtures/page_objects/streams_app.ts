/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ScoutPage, expect } from '@kbn/scout';

export class StreamsApp {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('streams');
    await expect(this.page.getByText('StreamsTechnical Preview')).toBeVisible();
  }

  async gotoStreamsFromBreadcrumb() {
    await this.page
      .getByTestId('breadcrumbs')
      .getByRole('link', { name: 'Streams', exact: true })
      .click();
  }

  async gotoStream(stream: string) {
    const last = await this.page.getByTestId('breadcrumb last').textContent();
    if (last !== 'Streams') {
      await this.gotoStreamsFromBreadcrumb();
    }
    await this.page.getByRole('link', { name: stream, exact: true }).click();
  }

  async gotoStreamDashboard(stream: string) {
    await this.gotoStream(stream);
    await this.page.getByRole('tab', { name: 'Dashboards' }).click();
  }

  async gotoCreateChildStream(stream: string) {
    await this.gotoStream(stream);
    await this.page.getByRole('tab', { name: 'Partitioning' }).click();
    await this.page.getByRole('button', { name: 'Create child stream' }).click();
  }

  async gotoDataRetentionTab(stream: string) {
    await this.gotoStream(stream);
    await this.page.getByRole('tab', { name: 'Data retention' }).click();
  }

  async gotoProcessingTab(stream: string) {
    await this.gotoStream(stream);
    await this.page.getByRole('tab', { name: 'Processing' }).click();
  }

  async gotoSchemaEditorTab(stream: string) {
    await this.gotoStream(stream);
    await this.page.getByRole('tab', { name: 'Schema editor' }).click();
  }
}
