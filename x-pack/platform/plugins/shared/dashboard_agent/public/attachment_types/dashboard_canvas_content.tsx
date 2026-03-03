/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { DashboardApi, DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { normalizePanels } from './panel_grid_layout';

interface DashboardCanvasInitialInput {
  timeRange: {
    from: string;
    to: string;
  };
  viewMode: 'view';
  panels: DashboardState['panels'];
  title?: string;
  description?: string;
}

const createDashboardRendererInitialInput = (
  data: DashboardAttachmentData
): DashboardCanvasInitialInput => ({
  timeRange: { from: 'now-24h', to: 'now' },
  viewMode: 'view',
  panels: normalizePanels(data.panels ?? []) as DashboardState['panels'],
  title: data.title,
  description: data.description,
});

const getDashboardRendererCreationOptions = async ({
  savedObjectId,
  initialDashboardInput,
}: {
  savedObjectId?: string;
  initialDashboardInput: DashboardCanvasInitialInput;
}): Promise<DashboardCreationOptions> => {
  if (savedObjectId) {
    return {
      getInitialInput: () => ({
        viewMode: 'view',
      }),
    };
  }

  return {
    getInitialInput: () => ({
      ...initialDashboardInput,
    }),
  };
};

export const saveDashboardFromApi = async (dashboardApi: DashboardApi): Promise<void> => {
  if (dashboardApi.savedObjectId$.value) {
    await dashboardApi.runQuickSave();
    return;
  }

  await dashboardApi.runInteractiveSave();
};

const dashboardCanvasContentStyles = {
  root: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 400,
    '& .dashboardViewport': {
      minHeight: 0,
    },
    '& .embPanel__hoverActions': {
      display: 'none !important',
    },
  }),
  actions: ({ euiTheme }) =>
    css({
      padding: euiTheme.size.m,
    }),
  renderer: css({
    flex: 1,
    minHeight: 0,
    display: 'flex',
  }),
};

export const DashboardCanvasContent = ({
  attachment: { data },
}: AttachmentRenderProps<DashboardAttachment>) => {
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const styles = useMemoCss(dashboardCanvasContentStyles);

  const initialDashboardInput = useMemo(() => createDashboardRendererInitialInput(data), [data]);

  const getCreationOptions = useCallback(
    () =>
      getDashboardRendererCreationOptions({
        savedObjectId: data.savedObjectId,
        initialDashboardInput,
      }),
    [data.savedObjectId, initialDashboardInput]
  );

  const handleSave = useCallback(async () => {
    if (!dashboardApi || isSaveInProgress) {
      return;
    }

    setIsSaveInProgress(true);
    try {
      await saveDashboardFromApi(dashboardApi);
    } finally {
      setIsSaveInProgress(false);
    }
  }, [dashboardApi, isSaveInProgress]);

  return (
    <div css={styles.root}>
      <div css={styles.actions}>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              size="s"
              iconType="save"
              onClick={handleSave}
              isLoading={isSaveInProgress}
              disabled={!dashboardApi || isSaveInProgress}
              data-test-subj="dashboardCanvasSaveButton"
            >
              {i18n.translate('xpack.dashboardAgent.attachments.dashboard.canvasSaveActionLabel', {
                defaultMessage: 'Save dashboard',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div css={styles.renderer}>
        <DashboardRenderer
          getCreationOptions={getCreationOptions}
          showPlainSpinner
          savedObjectId={data.savedObjectId}
          onApiAvailable={(api) => {
            api.setViewMode('view');
            setDashboardApi(api);
          }}
        />
      </div>
    </div>
  );
};
