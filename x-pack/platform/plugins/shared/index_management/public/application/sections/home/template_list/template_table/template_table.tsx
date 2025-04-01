/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import { EuiInMemoryTable, EuiBasicTableColumn, EuiButton, EuiLink, EuiIcon } from '@elastic/eui';
import { ScopedHistory } from '@kbn/core/public';

import { useEuiTablePersist } from '@kbn/shared-ux-table-persist';
import { TemplateListItem } from '../../../../../../common';
import { UIM_TEMPLATE_SHOW_DETAILS_CLICK } from '../../../../../../common/constants';
import { UseRequestResponse, reactRouterNavigate } from '../../../../../shared_imports';
import { useServices } from '../../../../app_context';
import { TemplateDeleteModal } from '../../../../components';
import { TemplateContentIndicator } from '../../../../components/shared';
import { getComponentTemplatesLink, getTemplateDetailsLink } from '../../../../services/routing';
import { TemplateTypeIndicator, TemplateDeprecatedBadge } from '../components';

interface Props {
  templates: TemplateListItem[];
  reload: UseRequestResponse['resendRequest'];
  editTemplate: (name: string) => void;
  cloneTemplate: (name: string) => void;
  history: ScopedHistory;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export const TemplateTable: React.FunctionComponent<Props> = ({
  templates,
  reload,
  editTemplate,
  cloneTemplate,
  history,
}) => {
  const { uiMetricService } = useServices();
  const [selection, setSelection] = useState<TemplateListItem[]>([]);
  const [templatesToDelete, setTemplatesToDelete] = useState<
    Array<{ name: string; isLegacy?: boolean; type?: string }>
  >([]);

  const columns: Array<EuiBasicTableColumn<TemplateListItem>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.idxMgmt.templateList.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      width: '30%',
      render: (name: TemplateListItem['name'], item: TemplateListItem) => {
        return (
          <span>
            <EuiLink
              {...reactRouterNavigate(history, getTemplateDetailsLink(name), () =>
                uiMetricService.trackMetric(METRIC_TYPE.CLICK, UIM_TEMPLATE_SHOW_DETAILS_CLICK)
              )}
              role="button"
              data-test-subj="templateDetailsLink"
            >
              {name}
            </EuiLink>{' '}
            {item.deprecated && (
              <>
                &nbsp;
                <TemplateDeprecatedBadge />
              </>
            )}
            &nbsp;
            <TemplateTypeIndicator templateType={item._kbnMeta.type} />
          </span>
        );
      },
    },
    {
      field: 'indexPatterns',
      name: i18n.translate('xpack.idxMgmt.templateList.table.indexPatternsColumnTitle', {
        defaultMessage: 'Index patterns',
      }),
      sortable: true,
      width: '20%',
      render: (indexPatterns: string[]) => <strong>{indexPatterns.join(', ')}</strong>,
    },
    {
      field: 'composedOf',
      name: i18n.translate('xpack.idxMgmt.templateList.table.componentsColumnTitle', {
        defaultMessage: 'Component templates',
      }),
      width: '100px',
      truncateText: true,
      sortable: (template) => {
        return template.composedOf?.length;
      },
      render: (composedOf: string[] = [], item: TemplateListItem) =>
        composedOf.length === 0 ? (
          <span>0</span>
        ) : (
          <EuiLink
            data-test-subj="componentTemplatesLink"
            {...reactRouterNavigate(history, getComponentTemplatesLink(item.name))}
          >
            {composedOf.length}
          </EuiLink>
        ),
    },
    {
      name: i18n.translate('xpack.idxMgmt.templateList.table.dataStreamColumnTitle', {
        defaultMessage: 'Data stream',
      }),
      width: '90px',
      align: 'center',
      truncateText: true,
      render: (template: TemplateListItem) =>
        template._kbnMeta.hasDatastream ? <EuiIcon type="check" /> : null,
    },
    {
      name: i18n.translate('xpack.idxMgmt.templateList.table.contentColumnTitle', {
        defaultMessage: 'Content',
      }),
      width: '120px',
      render: (item: TemplateListItem) => (
        <TemplateContentIndicator
          mappings={item.hasMappings}
          settings={item.hasSettings}
          aliases={item.hasAliases}
          contentWhenEmpty={
            <em>
              {i18n.translate('xpack.idxMgmt.templateList.table.noneDescriptionText', {
                defaultMessage: 'None',
              })}
            </em>
          }
        />
      ),
    },
    {
      name: i18n.translate('xpack.idxMgmt.templateList.table.actionColumnTitle', {
        defaultMessage: 'Actions',
      }),
      width: '120px',
      actions: [
        {
          name: i18n.translate('xpack.idxMgmt.templateList.table.actionEditText', {
            defaultMessage: 'Edit',
          }),
          isPrimary: true,
          description: i18n.translate('xpack.idxMgmt.templateList.table.actionEditDecription', {
            defaultMessage: 'Edit this template',
          }),
          icon: 'pencil',
          type: 'icon',
          onClick: ({ name }: TemplateListItem) => {
            editTemplate(name);
          },
          enabled: ({ _kbnMeta: { type } }: TemplateListItem) => type !== 'cloudManaged',
        },
        {
          type: 'icon',
          name: i18n.translate('xpack.idxMgmt.templateList.table.actionCloneTitle', {
            defaultMessage: 'Clone',
          }),
          description: i18n.translate('xpack.idxMgmt.templateList.table.actionCloneDescription', {
            defaultMessage: 'Clone this template',
          }),
          icon: 'copy',
          onClick: ({ name }: TemplateListItem) => {
            cloneTemplate(name);
          },
        },
        {
          name: i18n.translate('xpack.idxMgmt.templateList.table.actionDeleteText', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate('xpack.idxMgmt.templateList.table.actionDeleteDecription', {
            defaultMessage: 'Delete this template',
          }),
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          onClick: ({ name, _kbnMeta: { isLegacy, type } }: TemplateListItem) => {
            setTemplatesToDelete([{ name, isLegacy, type }]);
          },
          isPrimary: true,
          enabled: ({ _kbnMeta: { type } }: TemplateListItem) => type !== 'cloudManaged',
        },
      ],
    },
  ];

  const { pageSize, sorting, onTableChange } = useEuiTablePersist<TemplateListItem>({
    tableId: 'indexTemplates',
    initialPageSize: 20,
    initialSort: {
      field: 'name',
      direction: 'asc',
    },
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });

  const pagination = {
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };

  const selectionConfig = {
    onSelectionChange: setSelection,
    selectable: ({ _kbnMeta: { type } }: TemplateListItem) => type !== 'cloudManaged',
    selectableMessage: (selectable: boolean) => {
      if (!selectable) {
        return i18n.translate(
          'xpack.idxMgmt.templateList.table.deleteCloudManagedTemplateTooltip',
          {
            defaultMessage: 'You cannot delete a cloud-managed template.',
          }
        );
      }
      return '';
    },
  };

  const searchConfig = {
    box: {
      incremental: true,
    },
    toolsLeft:
      selection.length > 0 ? (
        <EuiButton
          data-test-subj="deleteTemplatesButton"
          onClick={() =>
            setTemplatesToDelete(
              selection.map(({ name, _kbnMeta: { isLegacy, type } }: TemplateListItem) => ({
                name,
                isLegacy,
                type,
              }))
            )
          }
          color="danger"
        >
          <FormattedMessage
            id="xpack.idxMgmt.templateList.table.deleteTemplatesButtonLabel"
            defaultMessage="Delete {count, plural, one {template} other {templates} }"
            values={{ count: selection.length }}
          />
        </EuiButton>
      ) : undefined,
    toolsRight: [
      <EuiButton
        iconType="plusInCircle"
        data-test-subj="createTemplateButton"
        key="createTemplateButton"
        fill
        {...reactRouterNavigate(history, '/create_template')}
      >
        <FormattedMessage
          id="xpack.idxMgmt.templateList.table.createTemplatesButtonLabel"
          defaultMessage="Create template"
        />
      </EuiButton>,
    ],
  };

  const goToList = () => {
    return history.push('templates');
  };

  return (
    <Fragment>
      {templatesToDelete && templatesToDelete.length > 0 ? (
        <TemplateDeleteModal
          callback={(data) => {
            if (data && data.hasDeletedTemplates) {
              reload();
              // Close the flyout if it is opened
              goToList();
            }
            setTemplatesToDelete([]);
          }}
          templatesToDelete={templatesToDelete}
        />
      ) : null}
      <EuiInMemoryTable
        items={templates || []}
        itemId="name"
        columns={columns}
        search={searchConfig}
        sorting={sorting}
        selection={selectionConfig}
        pagination={pagination}
        onTableChange={onTableChange}
        rowProps={() => ({
          'data-test-subj': 'row',
        })}
        cellProps={() => ({
          'data-test-subj': 'cell',
        })}
        data-test-subj="templateTable"
        message={
          <FormattedMessage
            id="xpack.idxMgmt.templateList.table.noIndexTemplatesMessage"
            defaultMessage="No index templates found"
          />
        }
      />
    </Fragment>
  );
};
