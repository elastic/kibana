/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { OnechatTools } from '../components/tools/tools';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';

export const OnechatToolsPage = () => {
  useBreadcrumb([
    { text: i18n.translate('xpack.onechat.chat.title', { defaultMessage: 'Chat' }) },
    { text: i18n.translate('xpack.onechat.tools.title', { defaultMessage: 'Tools' }) },
  ]);
  return <OnechatTools />;
};
