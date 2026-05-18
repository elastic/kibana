/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import React, { useCallback, useState } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  type ActionButton,
  type InlineRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { useLensInput } from './use_lens_input';
import { BaseVisualization } from '../shared/base_visualization';
import { FallbackVisualizationActions } from '../shared/visualization_actions';
import { visualizationWrapperStyles } from '../shared/styles';

export function VisualizeLens({
  lens,
  dataViews,
  uiActions,
  lensConfig,
  timeRange,
  registerActionButtons,
}: {
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  uiActions: UiActionsStart;
  lensConfig: any;
  timeRange?: TimeRange;
  registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
}) {
  const { lensInput, setLensInput, isLoading, error } = useLensInput({
    lens,
    dataViews,
    lensConfig,
    timeRange,
  });
  const [localActionButtons, setLocalActionButtons] = useState<ActionButton[]>([]);
  const registerLocalActionButtons = useCallback((buttons: ActionButton[]) => {
    setLocalActionButtons(buttons);
  }, []);
  const shouldRenderLocalActionButtons = !registerActionButtons && localActionButtons.length > 0;

  if (error) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.agentBuilder.visualizeLens.error.title', {
          defaultMessage: 'Unable to render visualization',
        })}
        color="danger"
        iconType="error"
        size="s"
        announceOnMount
      >
        <p>{error.message}</p>
      </EuiCallOut>
    );
  }

  return (
    <div data-test-subj="lensVisualization" css={visualizationWrapperStyles}>
      {shouldRenderLocalActionButtons && (
        <FallbackVisualizationActions buttons={localActionButtons} />
      )}
      <BaseVisualization
        lens={lens}
        uiActions={uiActions}
        lensInput={lensInput}
        setLensInput={setLensInput}
        isLoading={isLoading}
        registerActionButtons={registerActionButtons ?? registerLocalActionButtons}
      />
    </div>
  );
}
