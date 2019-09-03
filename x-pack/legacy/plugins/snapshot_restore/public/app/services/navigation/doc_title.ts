/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { textService } from '../text';

class DocTitleService {
  private changeDocTitle: any = () => {};

  public init(changeDocTitle: any): void {
    this.changeDocTitle = changeDocTitle;
  }

  public setTitle(page?: string): void {
    if (!page || page === 'home') {
      this.changeDocTitle(`${textService.breadcrumbs.home}`);
    } else if (textService.breadcrumbs[page]) {
      this.changeDocTitle(`${textService.breadcrumbs[page]} - ${textService.breadcrumbs.home}`);
    }
  }
}

export const docTitleService = new DocTitleService();
