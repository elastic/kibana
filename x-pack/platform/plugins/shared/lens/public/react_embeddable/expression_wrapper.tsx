/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiProgress } from '@elastic/eui';
import type {
  ExpressionRendererEvent,
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from '@kbn/expressions-plugin/public';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { ExecutionContextSearch } from '@kbn/es-query';
import type { RenderMode } from '@kbn/expressions-plugin/common';
import classNames from 'classnames';
import { Global } from '@emotion/react';
import type { UserMessage, LensInspector } from '@kbn/lens-common';
import { getOriginalRequestErrorMessages } from '../editor_frame_service/error_helper';
import { lnsExpressionRendererStyle, lnsGlobalChartStyles } from '../expression_renderer_styles';

export interface ExpressionWrapperProps {
  ExpressionRenderer: ReactExpressionRendererType;
  expression: string | null;
  variables?: Record<string, unknown>;
  interactive?: boolean;
  searchContext: ExecutionContextSearch;
  searchSessionId?: string;
  handleEvent: (event: ExpressionRendererEvent) => void;
  onData$: ReactExpressionRendererProps['onData$'];
  onRender$: (count: number) => void;
  renderMode?: RenderMode;
  syncColors?: boolean;
  syncTooltips?: boolean;
  syncCursor?: boolean;
  hasCompatibleActions?: ReactExpressionRendererProps['hasCompatibleActions'];
  getCompatibleCellValueActions?: ReactExpressionRendererProps['getCompatibleCellValueActions'];
  style?: React.CSSProperties;
  className?: string;
  addUserMessages: (messages: UserMessage[]) => void;
  onRuntimeError: (error: Error) => void;
  executionContext?: KibanaExecutionContext;
  lensInspector: LensInspector;
  noPadding?: boolean;
  paddingTop?: boolean;
  abortController?: AbortController;
}

export function ExpressionWrapper({
  ExpressionRenderer: ExpressionRendererComponent,
  expression,
  searchContext,
  variables,
  handleEvent,
  interactive,
  searchSessionId,
  onData$,
  onRender$,
  renderMode,
  syncColors,
  syncTooltips,
  syncCursor,
  hasCompatibleActions,
  getCompatibleCellValueActions,
  style,
  className,
  onRuntimeError,
  addUserMessages,
  executionContext,
  lensInspector,
  noPadding,
  paddingTop,
  abortController,
}: ExpressionWrapperProps) {
  const [isShowingApproximate, setIsShowingApproximate] = useState(false);

  const wrappedOnData$ = useCallback<NonNullable<ReactExpressionRendererProps['onData$']>>(
    (data, adapters, partial) => {
      setIsShowingApproximate(Boolean(partial));
      onData$?.(data, adapters, partial);
    },
    [onData$]
  );

  if (!expression) return null;
  return (
    <>
      <Global styles={lnsGlobalChartStyles} />
      <div
        className={classNames('lnsExpressionRenderer', 'eui-scrollBar', className)}
        css={lnsExpressionRendererStyle}
        style={style}
        data-test-subj="lens-embeddable"
      >
        {isShowingApproximate && (
          <EuiProgress size="xs" color="accent" position="absolute" style={{ zIndex: 2 }} />
        )}
        <ExpressionRendererComponent
          padding={noPadding ? undefined : 's'}
          paddingTop={paddingTop}
          variables={variables}
          allowCache={true}
          partial={true}
          expression={expression}
          interactive={interactive}
          searchContext={searchContext}
          searchSessionId={searchSessionId}
          onData$={wrappedOnData$}
          onRender$={onRender$}
          inspectorAdapters={lensInspector.getInspectorAdapters()}
          renderMode={renderMode}
          syncColors={syncColors}
          syncTooltips={syncTooltips}
          syncCursor={syncCursor}
          executionContext={executionContext}
          abortController={abortController}
          renderError={(errorMessage, error) => {
            const messages = getOriginalRequestErrorMessages(error || null);
            addUserMessages(messages);
            onRuntimeError(error?.original || new Error(errorMessage ? errorMessage : ''));
            return <></>; // the embeddable will take care of displaying the messages
          }}
          onEvent={handleEvent}
          hasCompatibleActions={hasCompatibleActions}
          getCompatibleCellValueActions={getCompatibleCellValueActions}
        />
      </div>
    </>
  );
}
