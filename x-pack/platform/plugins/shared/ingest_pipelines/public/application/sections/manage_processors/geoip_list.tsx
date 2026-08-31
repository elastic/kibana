/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

import type { EuiInMemoryTableProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiInMemoryTable,
  EuiPageTemplate,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { AppHeaderMenu } from '@kbn/app-header';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { getDatabaseText } from './utils';
import type { GeoipDatabase } from '../../../../common/types';
import { SectionLoading, useKibana } from '../../../shared_imports';
import { PipelineAppHeader } from '../../components';
import { getTypeLabel } from './constants';
import { EmptyList } from './empty_list';
import { AddDatabaseModal } from './add_database_modal';
import { DeleteDatabaseModal } from './delete_database_modal';
import { getErrorMessage } from './get_error_message';

const addDatabaseButtonLabel = i18n.translate(
  'xpack.ingestPipelines.manageProcessors.geoip.addDatabaseButtonLabel',
  { defaultMessage: 'Add database' }
);

const manageProcessorsTitle = i18n.translate('xpack.ingestPipelines.manageProcessors.pageTitle', {
  defaultMessage: 'Manage Processors',
});

const styles = {
  table: css`
    height: 100%;
  `,
};

export const GeoipList: React.FunctionComponent = () => {
  const { services } = useKibana();
  const history = useHistory();
  const { data, isLoading, error, resendRequest } = services.api.useLoadDatabases();
  const [showModal, setShowModal] = useState<'add' | 'delete' | null>(null);
  const [databaseToDelete, setDatabaseToDelete] = useState<GeoipDatabase | null>(null);
  const onDatabaseDelete = (item: GeoipDatabase) => {
    setDatabaseToDelete(item);
    setShowModal('delete');
  };
  const openAddDatabaseModal = () => {
    setShowModal('add');
  };
  let content: JSX.Element;
  const addDatabaseButton = (
    <EuiButton
      fill
      iconType="plusCircle"
      onClick={openAddDatabaseModal}
      data-test-subj="addGeoipDatabaseButton"
    >
      {addDatabaseButtonLabel}
    </EuiButton>
  );
  const showAddInHeader = Boolean(data && data.length > 0) && !error;
  const menu: AppHeaderMenu | undefined = showAddInHeader
    ? {
        primaryActionItem: {
          id: 'addDatabase',
          label: addDatabaseButtonLabel,
          iconType: 'plusCircle',
          testId: 'addGeoipDatabaseButton',
          run: openAddDatabaseModal,
        },
      }
    : undefined;
  const tableProps: EuiInMemoryTableProps<GeoipDatabase> = {
    'data-test-subj': 'geoipDatabaseList',
    rowProps: () => ({
      'data-test-subj': 'geoipDatabaseListRow',
    }),
    columns: [
      {
        field: 'name',
        name: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.list.nameColumnTitle', {
          defaultMessage: 'Database name',
        }),
        sortable: true,
        render: (name: string, row) => {
          if (row.type === 'ipinfo') {
            // Use the translated text for this database, if it exists
            return getDatabaseText(name, 'ipinfo') ?? name;
          }

          return name;
        },
      },
      {
        field: 'type',
        name: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.list.typeColumnTitle', {
          defaultMessage: 'Type',
        }),
        sortable: true,
        render: (type: GeoipDatabase['type']) => {
          return getTypeLabel(type);
        },
      },
      {
        name: 'Actions',
        align: 'right',
        render: (item: GeoipDatabase) => {
          // Local and web databases are read only and cannot be deleted through UI
          if (['web', 'local'].includes(item.type)) {
            return;
          }

          return (
            <EuiToolTip
              content={i18n.translate(
                'xpack.ingestPipelines.manageProcessors.geoip.list.actionIconLabel',
                {
                  defaultMessage: 'Delete this database',
                }
              )}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                name="Delete"
                aria-label={i18n.translate(
                  'xpack.ingestPipelines.manageProcessors.geoip.list.actionIconLabel',
                  {
                    defaultMessage: 'Delete this database',
                  }
                )}
                iconType="trash"
                color="danger"
                onClick={() => onDatabaseDelete(item)}
                data-test-subj="deleteGeoipDatabaseButton"
              />
            </EuiToolTip>
          );
        },
      },
    ],
    items: data ?? [],
  };
  if (error) {
    content = (
      <EuiPageTemplate.EmptyPrompt
        color="danger"
        iconType="warning"
        title={
          <h2 data-test-subj="geoipListLoadingError">
            <FormattedMessage
              id="xpack.ingestPipelines.manageProcessors.geoip.list.loadErrorTitle"
              defaultMessage="Unable to load geoIP databases"
            />
          </h2>
        }
        body={<p>{getErrorMessage(error)}</p>}
        actions={
          <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.ingestPipelines.manageProcessors.geoip.list.geoipListReloadButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        }
      />
    );
  } else if (isLoading && !data) {
    content = (
      <SectionLoading data-test-subj="sectionLoading">
        <FormattedMessage
          id="xpack.ingestPipelines.manageProcessors.geoip.list.loadingMessage"
          defaultMessage="Loading geoIP databases..."
        />
      </SectionLoading>
    );
  } else if (data && data.length === 0) {
    content = <EmptyList addDatabaseButton={addDatabaseButton} />;
  } else {
    content = (
      <>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.ingestPipelines.manageProcessors.geoip.tableTitle"
              defaultMessage="IP Location"
            />
          </h2>
        </EuiTitle>

        <EuiSpacer size="l" />
        <EuiInMemoryTable
          css={styles.table}
          tableCaption={i18n.translate(
            'xpack.ingestPipelines.manageProcessors.geoip.list.tableCaption',
            {
              defaultMessage: 'List of geoIP databases',
            }
          )}
          {...tableProps}
        />
      </>
    );
  }
  return (
    <>
      <PipelineAppHeader title={manageProcessorsTitle} history={history} menu={menu} />
      {content}
      {showModal === 'add' && (
        <AddDatabaseModal
          closeModal={() => setShowModal(null)}
          reloadDatabases={resendRequest}
          databases={data!}
        />
      )}
      {showModal === 'delete' && databaseToDelete && (
        <DeleteDatabaseModal
          database={databaseToDelete}
          reloadDatabases={resendRequest}
          closeModal={() => setShowModal(null)}
        />
      )}
    </>
  );
};
