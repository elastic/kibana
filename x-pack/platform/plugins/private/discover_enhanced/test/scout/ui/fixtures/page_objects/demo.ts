/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbstractPageObject } from '@kbn/scout';

export class DemoPage extends AbstractPageObject {
  async goto() {
    await this.page.gotoApp('not_implemented');
  }
}
