/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

class TextService {
  public breadcrumbs: { [key: string]: string } = {};
  public i18n: any;

  public init(i18n: any): void {
    this.i18n = i18n;

    this.breadcrumbs = {
      home: i18n.translate('xpack.alertingUI.home.breadcrumbTitle', {
        defaultMessage: 'Alerting UI',
      }),
      actions: i18n.translate('xpack.alertingUI.actions.breadcrumbTitle', {
        defaultMessage: 'Actions',
      }),
    };
  }
}

export const textService = new TextService();
