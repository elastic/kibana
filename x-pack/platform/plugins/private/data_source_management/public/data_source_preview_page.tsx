/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Redirect } from 'react-router-dom';
import type { RouteComponentProps } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPageHeader,
  EuiPageSection,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { LIST_BREADCRUMB, PLUGIN_NAME } from '../common';
import type { DataSetListItem } from '../common/sample_data_sets_client';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import {
  dataSourcePreviewFlyoutStrings,
  dataSourcePreviewPageStrings,
} from './data_source_preview_flyout_i18n';
import {
  DataSourcePreviewDescription,
  DataSourcePreviewDetails,
  DataSourcePreviewTitleWithType,
} from './data_source_preview_shared';
import { DATA_SOURCE_MANAGEMENT_ROUTES } from './data_source_management_routes';
import { useDataSourceManagementAppContext } from './data_source_management_app_context';

type MatchParams = { sourceId: string };

export const DataSourcePreviewPage: FunctionComponent<RouteComponentProps<MatchParams>> = ({
  history,
  match,
}) => {
  const sourceId = decodeURIComponent(match.params.sourceId);
  const { coreStart, setBreadcrumbs, dataSourcesClient, dataSetsClient } =
    useDataSourceManagementAppContext();
  const { docTitle } = coreStart.chrome;
  const { overlays } = coreStart;

  const [source, setSource] = useState<DataSourceListItem | null | undefined>(undefined);
  const [dataSetItems, setDataSetItems] = useState<DataSetListItem[]>([]);
  const [isManagePopoverOpen, setManagePopoverOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [nextSources, nextSets] = await Promise.all([
        dataSourcesClient.get(),
        dataSetsClient.get(),
      ]);
      if (cancelled) {
        return;
      }
      setDataSetItems(nextSets);
      setSource(nextSources.find((row) => row.id === sourceId) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSourcesClient, dataSetsClient, sourceId]);

  const previewSets = useMemo(
    () =>
      source
        ? dataSetItems.filter((setItem) => setItem.sourceName === source.name)
        : [],
    [dataSetItems, source]
  );

  const refreshDataSets = useCallback(async () => {
    setDataSetItems(await dataSetsClient.get());
  }, [dataSetsClient]);

  const closeManagePopover = useCallback(() => {
    setManagePopoverOpen(false);
  }, []);

  const toggleManagePopover = useCallback(() => {
    setManagePopoverOpen((open) => !open);
  }, []);

  const handleEditSource = useCallback(() => {
    closeManagePopover();
  }, [closeManagePopover]);

  const handleDeleteSource = useCallback(() => {
    if (!source) {
      return;
    }
    closeManagePopover();
    void overlays
      .openConfirm(dataSourcePreviewPageStrings.deleteSourceConfirmMessage(source.name), {
        title: dataSourcePreviewPageStrings.deleteSourceConfirmTitle(),
        confirmButtonText: dataSourcePreviewPageStrings.deleteSourceConfirmButton(),
        cancelButtonText: dataSourcePreviewPageStrings.cancelButton(),
        buttonColor: 'danger',
        'data-test-subj': 'deleteDataSourceConfirmModal',
      })
      .then(async (confirmed) => {
        if (!confirmed || !source) {
          return;
        }
        await dataSetsClient.deleteBySourceName(source.name);
        await dataSourcesClient.delete([source.name]);
        history.push(DATA_SOURCE_MANAGEMENT_ROUTES.list);
      });
  }, [
    closeManagePopover,
    dataSetsClient,
    dataSourcesClient,
    history,
    overlays,
    source,
  ]);

  const manageMenuItems = useMemo(
    () => [
      <EuiContextMenuItem
        key="edit"
        icon="pencil"
        data-test-subj="dataSourcePreviewEditSourceMenuItem"
        onClick={handleEditSource}
      >
        <EuiText size="s">{dataSourcePreviewPageStrings.editSourceMenuItem()}</EuiText>
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="delete"
        icon="trash"
        data-test-subj="dataSourcePreviewDeleteSourceMenuItem"
        onClick={handleDeleteSource}
      >
        <EuiText color="danger" size="s">
          {dataSourcePreviewPageStrings.deleteSourceMenuItem()}
        </EuiText>
      </EuiContextMenuItem>,
    ],
    [handleDeleteSource, handleEditSource]
  );

  const manageMenuButton = (
    <EuiButtonEmpty
      iconType="chevronSingleDown"
      iconSide="right"
      data-test-subj="dataSourcePreviewManageMenuButton"
      onClick={toggleManagePopover}
    >
      {dataSourcePreviewPageStrings.manageButton()}
    </EuiButtonEmpty>
  );

  useEffect(() => {
    if (!source) {
      return;
    }
    setBreadcrumbs([
      ...LIST_BREADCRUMB,
      {
        text: source.name,
      },
    ]);
    docTitle.change([source.name, PLUGIN_NAME]);
    return () => {
      docTitle.reset();
    };
  }, [docTitle, setBreadcrumbs, source]);

  if (source === undefined) {
    return null;
  }

  if (source === null) {
    return <Redirect to={DATA_SOURCE_MANAGEMENT_ROUTES.list} />;
  }

  return (
    <EuiPageSection paddingSize="m">
      {/* EuiPageHeader reverses `rightSideItems` on wider breakpoints; primary CTA first so it stays rightmost. */}
      <EuiPageHeader
        bottomBorder
        data-test-subj="dataSourceManagementPreviewPageHeader"
        pageTitle={
          <DataSourcePreviewTitleWithType
            title={source.name}
            source={source}
            titleSize="l"
            heading="h1"
            titleTestSubj="dataSourceManagementPreviewPageTitle"
          />
        }
        description={<DataSourcePreviewDescription source={source} variant="page" />}
        rightSideItems={[
          <EuiButton
            key="dataSourcePreviewManageDataSets"
            fill
            data-test-subj="dataSourcePreviewAddDataSet"
            onClick={() => {}}
          >
            {dataSourcePreviewFlyoutStrings.addDataSetButton()}
          </EuiButton>,
          <EuiPopover
            key="dataSourcePreviewManage"
            button={manageMenuButton}
            isOpen={isManagePopoverOpen}
            closePopover={closeManagePopover}
            panelPaddingSize="none"
            anchorPosition="downRight"
          >
            <EuiContextMenuPanel size="s" items={manageMenuItems} />
          </EuiPopover>,
        ]}
      />
      <EuiSpacer size="l" />
      <DataSourcePreviewDetails sets={previewSets} onDataSetsChanged={refreshDataSets} />
    </EuiPageSection>
  );
};
