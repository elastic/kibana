/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useState } from 'react';
import type { EuiMarkdownEditorUiPlugin, EuiMarkdownAstNodePosition } from '@elastic/eui';
import type { Plugin } from 'unified';
/**
 * @description - manage the plugins, hooks, and ui components needed to enable timeline functionality within the cases plugin
 * @TODO - To better encapsulate the timeline logic needed by cases, we are managing it in this top level context.
 * This helps us avoid any prop drilling and makes it much easier later on to remove this logic when timeline becomes it's own plugin.
 */

// TODO: copied from 'use_insert_timeline' in security_solution till timeline moved into it's own plugin.
interface UseInsertTimelineReturn {
  handleOnTimelineChange: (title: string, id: string | null, graphEventId?: string) => void;
}

interface TimelineProcessingPluginRendererProps {
  id: string | null;
  title: string;
  graphEventId?: string;
  type: 'timeline';
  [key: string]: string | null | undefined;
}

export interface CasesTimelineIntegration {
  editor_plugins: {
    parsingPlugin: Plugin;
    processingPluginRenderer: React.FC<
      TimelineProcessingPluginRendererProps & { position: EuiMarkdownAstNodePosition }
    >;
    uiPlugin: EuiMarkdownEditorUiPlugin;
  };
  hooks: {
    useInsertTimeline: (
      value: string,
      onChange: (newValue: string) => void
    ) => UseInsertTimelineReturn;
  };
}

// This context is available to all children of the stateful_event component where the provider is currently set
export const CasesTimelineIntegrationContext = React.createContext<CasesTimelineIntegration | null>(
  null
);

export const CasesTimelineIntegrationProvider: FC<
  PropsWithChildren<{
    timelineIntegration?: CasesTimelineIntegration;
  }>
> =
  // TODO: Fix this manually. Issue #123375
  // eslint-disable-next-line react/display-name
  ({ children, timelineIntegration }) => {
    const [activeTimelineIntegration] = useState(timelineIntegration ?? null);

    return (
      <CasesTimelineIntegrationContext.Provider value={activeTimelineIntegration}>
        {children}
      </CasesTimelineIntegrationContext.Provider>
    );
  };
