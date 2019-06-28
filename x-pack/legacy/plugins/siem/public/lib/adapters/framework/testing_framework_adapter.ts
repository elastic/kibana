/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppFrameworkAdapter } from '../../lib';

export class AppTestingFrameworkAdapter implements AppFrameworkAdapter {
  public appState?: object;
  public bytesFormat?: string;
  public dateFormat?: string;
  public dateFormatTz?: string;
  public kbnVersion?: string;
  public scaledDateFormat?: string;
  public timezone?: string;

  constructor() {
    this.appState = {};
  }

  public render() {
    return;
  }
  public renderBreadcrumbs() {
    return;
  }
  public setUISettings() {
    return;
  }
}
