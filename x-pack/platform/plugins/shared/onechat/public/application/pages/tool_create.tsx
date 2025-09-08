/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ToolType } from '@kbn/onechat-common';
import { useParams } from 'react-router-dom';
import { CreateTool } from '../components/tools/create_tool';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const OnechatToolCreatePage = () => {
  const { toolType } = useParams<{ toolType: ToolType }>();
  useBreadcrumb([
    {
      text: labels.tools.title,
      path: appPaths.tools.list,
    },
    {
      text: labels.tools.newToolTitle,
      path: appPaths.tools.new({ toolType }),
    },
  ]);
  return <CreateTool />;
};
