/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';

import { CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { getEbtOwner } from './get_ebt_owner';

export type MarkdownEditorPluginType = 'lens' | 'timeline';

/**
 * Events Based Tracking for clicking a markdown editor plugin (lens or timeline)
 */
export const useMarkdownEditorPluginClickedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    (pluginType: MarkdownEditorPluginType) => {
      analytics.reportEvent(CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        plugin_type: pluginType,
      });
    },
    [analytics, owner]
  );
};
