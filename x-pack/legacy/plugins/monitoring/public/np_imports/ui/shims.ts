/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from '../legacy_imports';
const { core } = npStart;

export const toastNotifications = core.notifications.toasts;
export const I18nContext = core.i18n.Context;
export const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = core.docLinks;
export const docTitle = core.chrome.docTitle;
