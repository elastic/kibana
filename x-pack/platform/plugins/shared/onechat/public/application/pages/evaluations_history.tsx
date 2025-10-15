/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { labels } from '../utils/i18n';
import { appPaths } from '../utils/app_paths';
import { OnechatEvaluationsHistoryView } from '../components/evaluations/evaluations_history_view';

export const OnechatEvaluationsHistoryPage: React.FC = () => {
  useBreadcrumb([
    {
      text: labels.evaluations.title,
      path: appPaths.evaluations.list,
    },
  ]);
  return <OnechatEvaluationsHistoryView />;
};
