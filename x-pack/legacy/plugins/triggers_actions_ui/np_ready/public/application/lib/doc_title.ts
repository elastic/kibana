/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

class DocTitleService {
  private changeDocTitle: any = () => {};

  public init(changeDocTitle: any): void {
    this.changeDocTitle = changeDocTitle;
  }

  public setTitle(page?: string): void {
    let updatedTitle: string;

    switch (page) {
      case 'actions':
        updatedTitle = i18n.translate('xpack.triggersActionsUI.actions.breadcrumbTitle', {
          defaultMessage: 'Actions',
        });
        break;
      case 'alerts':
        updatedTitle = i18n.translate('xpack.triggersActionsUI.alerts.breadcrumbTitle', {
          defaultMessage: 'Alerts',
        });
        break;
      default:
        updatedTitle = i18n.translate('xpack.triggersActionsUI.home.breadcrumbTitle', {
          defaultMessage: 'Alerting',
        });
    }

    this.changeDocTitle(updatedTitle);
  }
}

export const docTitleService = new DocTitleService();
