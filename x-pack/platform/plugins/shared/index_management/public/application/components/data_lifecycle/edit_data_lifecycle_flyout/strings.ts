/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const PREFIX = 'xpack.idxMgmt.editDataLifecycleFlyout';

export const editDataLifecycleFlyoutStrings = {
  title: i18n.translate(`${PREFIX}.title`, {
    defaultMessage: 'Edit data lifecycle',
  }),
  tabsAriaLabel: i18n.translate(`${PREFIX}.tabsAriaLabel`, {
    defaultMessage: 'Data lifecycle tabs',
  }),
  successfulDataTabLabel: i18n.translate(`${PREFIX}.successfulDataTabLabel`, {
    defaultMessage: 'Successful data',
  }),
  failedDataTabLabel: i18n.translate(`${PREFIX}.failedDataTabLabel`, {
    defaultMessage: 'Failed data',
  }),
  inheritLabel: i18n.translate(`${PREFIX}.inheritLabel`, {
    defaultMessage: 'Inherit lifecycle from index template',
  }),
  viewIndexTemplateLabel: i18n.translate(`${PREFIX}.viewIndexTemplateLabel`, {
    defaultMessage: 'View index template',
  }),
  dataPhasesTitle: i18n.translate(`${PREFIX}.dataPhasesTitle`, {
    defaultMessage: 'Data phases',
  }),
  cancelButton: i18n.translate(`${PREFIX}.cancelButton`, {
    defaultMessage: 'Cancel',
  }),
  applyButton: i18n.translate(`${PREFIX}.applyButton`, {
    defaultMessage: 'Apply',
  }),
};
