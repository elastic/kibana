/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiIcon, EuiButton } from '@elastic/eui';
import { Template } from '../../../../../common/types';

interface Props {
  templates: Template[];
  reload: () => Promise<void>;
}

export const TemplatesTable: React.FunctionComponent<Props> = ({ templates, reload }) => {
  const Checkmark = ({ tableCellData }: { tableCellData: object }) => {
    const isChecked = Object.entries(tableCellData).length > 0;
    if (isChecked) {
      return <EuiIcon type="check" />;
    }
    return null;
  };

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'indexPatterns',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.indexPatternsColumnTitle', {
        defaultMessage: 'Index patterns',
      }),
      truncateText: true,
      sortable: true,
      render: (indexPatterns: string[]) => indexPatterns.join(', '),
    },
    {
      field: 'order',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.orderColumnTitle', {
        defaultMessage: 'Order',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'version',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.versionColumnTitle', {
        defaultMessage: 'Version',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'mappings',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.mappingsColumnTitle', {
        defaultMessage: 'Mappings',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (mappings: object) => <Checkmark tableCellData={mappings} />,
    },
    {
      field: 'settings',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.settingsColumnTitle', {
        defaultMessage: 'Settings',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (settings: object) => <Checkmark tableCellData={settings} />,
    },
    {
      field: 'aliases',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.aliasesColumnTitle', {
        defaultMessage: 'Aliases',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (aliases: object) => {
        return <Checkmark tableCellData={aliases} />;
      },
    },
  ];

  const searchConfig = {
    box: {
      incremental: true,
    },
    toolsRight: (
      <EuiButton
        color="secondary"
        iconType="refresh"
        onClick={reload}
        data-test-subj="reloadButton"
      >
        <FormattedMessage
          id="xpack.idxMgmt.templatesList.table.reloadTemplatesButton"
          defaultMessage="Reload"
        />
      </EuiButton>
    ),
  };

  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [10, 20, 50],
  };

  return (
    <EuiInMemoryTable
      items={templates}
      itemId="name"
      columns={columns}
      search={searchConfig}
      isSelectable={true}
      pagination={pagination}
      rowProps={() => ({
        'data-test-subj': 'row',
      })}
      cellProps={() => ({
        'data-test-subj': 'cell',
      })}
      data-test-subj="templatesTable"
      message={
        <FormattedMessage
          id="xpack.idxMgmt.templatesList.table.noIndexTemplatesMessage"
          defaultMessage="No index templates found"
        />
      }
    />
  );
};
