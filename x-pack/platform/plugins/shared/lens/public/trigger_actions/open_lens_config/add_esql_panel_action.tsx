/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart, OverlayFlyoutOpenOptions } from '@kbn/core/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiIsPresentationContainer, tracksOverlays } from '@kbn/presentation-containers';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiSkeletonText, EuiSkeletonTitle } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import useAsync from 'react-use/lib/useAsync';
import { ACTION_CREATE_ESQL_CHART } from './constants';
import { generateId } from '../../id_generator';
import type { LensApi } from '../../react_embeddable/types';

export class AddESQLPanelAction implements Action<EmbeddableApiContext> {
  public type = ACTION_CREATE_ESQL_CHART;
  public id = ACTION_CREATE_ESQL_CHART;
  public order = 50;

  public grouping = [ADD_PANEL_VISUALIZATION_GROUP];

  constructor(protected readonly core: CoreStart) {}

  public getDisplayName(): string {
    return i18n.translate('xpack.lens.app.createVisualizationLabel', {
      defaultMessage: 'ES|QL',
    });
  }

  public getIconType() {
    // need to create a new one
    return 'esqlVis';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return apiIsPresentationContainer(embeddable) && this.core.uiSettings.get(ENABLE_ESQL);
  }

  public async execute({ embeddable: api }: EmbeddableApiContext) {
    const overlayTracker = tracksOverlays(api) ? api : undefined;
    const onClose = () => {
      overlayTracker?.clearOverlays();
      flyoutRef?.close();
    };
    const flyoutRef = this.core.overlays.openFlyout(
      toMountPoint(
        <EditPanelWrapper
          closeFlyout={onClose}
          getEditFlyout={async () => {
            if (!apiIsPresentationContainer(api)) throw new IncompatibleActionError();
            const embeddable = await api.addNewPanel<object, LensApi>({
              panelType: 'lens',
              serializedState: {
                rawState: {
                  id: generateId(),
                  isNewPanel: true,
                  attributes: { references: [] },
                },
              },
            });

            return await embeddable?.onEdit?.();
          }}
        />,
        this.core
      ),
      { ...flyoutProps, onClose }
    );
    overlayTracker?.openOverlay(flyoutRef);
  }
}

const flyoutProps: OverlayFlyoutOpenOptions = {
  className: 'lnsConfigPanel__overlay',
  size: 's',
  type: 'push',
  paddingSize: 'm',
  maxWidth: 800,
  hideCloseButton: true,
  isResizable: true,
  outsideClickCloses: true,
};

const LoadingPanel = (
  <>
    <EuiFlyoutHeader hasBorder>
      <EuiSkeletonTitle size="xs" />
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiSkeletonText />
    </EuiFlyoutBody>
  </>
);

const EditPanelWrapper = ({
  closeFlyout,
  getEditFlyout,
}: {
  closeFlyout: () => void;
  getEditFlyout: (() => Promise<void | JSX.Element | null>) | undefined;
}) => {
  const [EditFlyoutPanel, setEditFlyoutPanel] = React.useState<React.JSX.Element | null>(
    null
  );
  useAsync(async () => {
    const editFlyoutContent = await getEditFlyout?.();
    if (editFlyoutContent) {
      setEditFlyoutPanel(React.cloneElement(editFlyoutContent, { closeFlyout }));
    }
  }, []);

  return EditFlyoutPanel ?? LoadingPanel;
};
