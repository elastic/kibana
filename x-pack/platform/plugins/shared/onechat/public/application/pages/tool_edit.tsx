/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EditEsqlTool } from '../components/tools/esql/edit_esql_tool';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { labels } from '../utils/i18n';
import { appPaths } from '../utils/app_paths';

export const OnechatToolEditPage = () => {
  const { toolId } = useParams<{ toolId: string }>();
  useBreadcrumb([
    {
      text: labels.tools.title,
      path: appPaths.tools.list,
    },
    {
      text: toolId,
      path: appPaths.tools.edit({ toolId }),
    },
  ]);
  return <EditEsqlTool />;
};
