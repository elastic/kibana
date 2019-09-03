/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraFrameworkAdapter } from '../../lib';

export class InfraTestingFrameworkAdapter implements InfraFrameworkAdapter {
  public appState?: object;
  public kbnVersion?: string;
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
