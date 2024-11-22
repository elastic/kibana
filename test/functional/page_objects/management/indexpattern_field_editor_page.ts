/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../../ftr_provider_context';

export class IndexPatternFieldEditorPageObject extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  public async isFieldPreviewVisible() {
    this.log.debug('isFieldPreviewVisible');
    return await this.testSubjects.exists('fieldPreviewItem', { timeout: 1500 });
  }
}
