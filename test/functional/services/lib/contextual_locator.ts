/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { By } from 'selenium-webdriver';
import { WebElementWrapper } from './web_element_wrapper';

export class ContextualLocator {
  constructor(private readonly context: WebElementWrapper, private readonly locator: By) {}

  async relocate() {
    return this.context._webElement.findElement(this.locator);
  }
}
