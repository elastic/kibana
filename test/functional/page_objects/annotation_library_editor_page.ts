/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

export class AnnotationEditorPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');

  /**
   * Fills out group metadata
   */
  public async editGroupMetadata(metadata: {
    title?: string;
    description?: string;
    dataView?: string;
  }) {
    if (metadata.title) {
      await this.testSubjects.setValue('annotationGroupTitle', metadata.title);
    }

    if (metadata.description) {
      await this.testSubjects.setValue('annotationGroupDescription', metadata.description);
    }

    if (metadata.dataView) {
      await this.testSubjects.setValue('annotationDataViewSelection', metadata.dataView);
    }

    await this.testSubjects.click('saveAnnotationGroup');
  }
}
