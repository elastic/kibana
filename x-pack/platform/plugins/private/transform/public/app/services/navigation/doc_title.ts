/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { textService } from '../text';

type ChangeDocTitle = (docTitle: string) => void;

class DocTitleService {
  private changeDocTitle: ChangeDocTitle = () => {};

  public init(changeDocTitle: ChangeDocTitle): void {
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
