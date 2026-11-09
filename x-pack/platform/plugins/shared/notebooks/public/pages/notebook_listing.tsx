/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { TableListView } from '@kbn/content-management-table-list-view';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view-table';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';
import { NOTEBOOK_SAVED_OBJECT_TYPE, PLUGIN_NAME, getNotebookPath } from '../../common/constants';
import { WEB_TRAFFIC_DEMO } from '../demo/web_traffic_demo';
import { useNotebookServices } from '../services';
import type { NotebookApi } from '../services/notebook_api';
import { useBreadcrumbs } from './use_breadcrumbs';

export const NotebookListing = ({ api }: { api: NotebookApi }) => {
  const { core } = useNotebookServices();
  const history = useHistory();
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  useBreadcrumbs();

  const loadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      const { id } = await api.create(WEB_TRAFFIC_DEMO);
      history.push(getNotebookPath(id));
    } catch (error) {
      core.notifications.toasts.addError(error, {
        title: i18n.translate('xpack.notebook.listing.demoError', {
          defaultMessage: 'Could not load the demo notebook',
        }),
      });
      setIsLoadingDemo(false);
    }
  };

  return (
    <TableListViewKibanaProvider core={core} FormattedRelative={FormattedRelative}>
      <TableListView<UserContentCommonSchema>
        id="notebook"
        headingId="notebookListingHeading"
        initialPageSize={20}
        title={PLUGIN_NAME}
        entityName={i18n.translate('xpack.notebook.listing.entityName', {
          defaultMessage: 'notebook',
        })}
        entityNamePlural={i18n.translate('xpack.notebook.listing.entityNamePlural', {
          defaultMessage: 'notebooks',
        })}
        additionalRightSideActions={[
          <EuiButton
            key="demo"
            iconType="documentation"
            onClick={loadDemo}
            isLoading={isLoadingDemo}
            data-test-subj="notebookLoadDemo"
          >
            {i18n.translate('xpack.notebook.listing.loadDemo', { defaultMessage: 'Load demo' })}
          </EuiButton>,
        ]}
        findItems={async (search) => {
          const { total, notebooks } = await api.find({ search, perPage: 100 });
          return {
            total,
            hits: notebooks.map(({ id, title, description, updatedAt }) => ({
              id,
              type: NOTEBOOK_SAVED_OBJECT_TYPE,
              updatedAt: updatedAt ?? '',
              references: [],
              attributes: { title, description },
            })),
          };
        }}
        createItem={() => history.push('/new')}
        deleteItems={async (items) => {
          await Promise.all(items.map(({ id }) => api.delete(id)));
        }}
        getOnClickTitle={({ id }) =>
          () =>
            history.push(getNotebookPath(id))}
      />
    </TableListViewKibanaProvider>
  );
};
