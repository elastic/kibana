/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiIcon, EuiButton, EuiLink } from '@elastic/eui';
import { TemplateListItem, Template } from '../../../../../../common/types';
import { BASE_PATH, UIM_TEMPLATE_SHOW_DETAILS_CLICK } from '../../../../../../common/constants';
import { TemplateDeleteModal } from '../../../../components';
import { uiMetricService } from '../../../../services/ui_metric';
import { getTemplateDetailsLink } from '../../../../services/routing';
import { SendRequestResponse } from '../../../../../shared_imports';

interface Props {
  templates: TemplateListItem[];
  reload: () => Promise<SendRequestResponse>;
  editTemplate: (name: Template['name']) => void;
  cloneTemplate: (name: Template['name']) => void;
}

export const TemplateTable: React.FunctionComponent<Props> = ({
  templates,
  reload,
  editTemplate,
  cloneTemplate,
}) => {
  const [selection, setSelection] = useState<TemplateListItem[]>([]);
  const [templatesToDelete, setTemplatesToDelete] = useState<Array<TemplateListItem['name']>>([]);

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.idxMgmt.templateList.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
      render: (name: TemplateListItem['name']) => {
        return (
          /* eslint-disable-next-line @elastic/eui/href-or-on-click */
          <EuiLink
            href={getTemplateDetailsLink(name, true)}
            data-test-subj="templateDetailsLink"
            onClick={() => uiMetricService.trackMetric('click', UIM_TEMPLATE_SHOW_DETAILS_CLICK)}
          >
            {name}
          </EuiLink>
        );
      },
    },
    {
      field: 'indexPatterns',
      name: i18n.translate('xpack.idxMgmt.templateList.table.indexPatternsColumnTitle', {
        defaultMessage: 'Index patterns',
      }),
      truncateText: true,
      sortable: true,
      render: (indexPatterns: string[]) => <strong>{indexPatterns.join(', ')}</strong>,
    },
    {
      field: 'ilmPolicy',
      name: i18n.translate('xpack.idxMgmt.templateList.table.ilmPolicyColumnTitle', {
        defaultMessage: 'ILM policy',
      }),
      truncateText: true,
      sortable: true,
      render: (ilmPolicy: { name: string }) =>
        ilmPolicy && ilmPolicy.name ? (
          <span
            title={i18n.translate('xpack.idxMgmt.templateList.table.ilmPolicyColumnDescription', {
              defaultMessage: "'{policyName}' index lifecycle policy",
              values: {
                policyName: ilmPolicy.name,
              },
            })}
          >
            {ilmPolicy.name}
          </span>
        ) : null,
    },
    {
      field: 'order',
      name: i18n.translate('xpack.idxMgmt.templateList.table.orderColumnTitle', {
        defaultMessage: 'Order',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'hasMappings',
      name: i18n.translate('xpack.idxMgmt.templateList.table.mappingsColumnTitle', {
        defaultMessage: 'Mappings',
      }),
      truncateText: true,
      sortable: true,
      render: (hasMappings: boolean) => (hasMappings ? <EuiIcon type="check" /> : null),
    },
    {
      field: 'hasSettings',
      name: i18n.translate('xpack.idxMgmt.templateList.table.settingsColumnTitle', {
        defaultMessage: 'Settings',
      }),
      truncateText: true,
      sortable: true,
      render: (hasSettings: boolean) => (hasSettings ? <EuiIcon type="check" /> : null),
    },
    {
      field: 'hasAliases',
      name: i18n.translate('xpack.idxMgmt.templateList.table.aliasesColumnTitle', {
        defaultMessage: 'Aliases',
      }),
      truncateText: true,
      sortable: true,
      render: (hasAliases: boolean) => (hasAliases ? <EuiIcon type="check" /> : null),
    },
    {
      name: i18n.translate('xpack.idxMgmt.templateList.table.actionColumnTitle', {
        defaultMessage: 'Actions',
      }),
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
          onClick: ({ name }: Template) => {
            editTemplate(name);
          },
          enabled: ({ isManaged }: Template) => !isManaged,
        },
        {
          name: i18n.translate('xpack.idxMgmt.templateList.table.actionCloneTitle', {
            defaultMessage: 'Clone',
          }),
          description: i18n.translate('xpack.idxMgmt.templateList.table.actionCloneDescription', {
            defaultMessage: 'Clone this template',
          }),
          icon: 'copy',
          onClick: ({ name }: Template) => {
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
          onClick: ({ name }: Template) => {
            setTemplatesToDelete([name]);
          },
          isPrimary: true,
          enabled: ({ isManaged }: Template) => !isManaged,
        },
      ],
    },
  ];

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const sorting = {
    sort: {
      field: 'name',
      direction: 'asc',
    },
  };

  const selectionConfig = {
    onSelectionChange: setSelection,
    selectable: ({ isManaged }: Template) => !isManaged,
    selectableMessage: (selectable: boolean) => {
      if (!selectable) {
        return i18n.translate('xpack.idxMgmt.templateList.table.deleteManagedTemplateTooltip', {
          defaultMessage: 'You cannot delete a managed template.',
        });
      }
    },
  };

  const searchConfig = {
    box: {
      incremental: true,
    },
    toolsLeft: selection.length && (
      <EuiButton
        data-test-subj="deleteTemplatesButton"
        onClick={() =>
          setTemplatesToDelete(selection.map((selected: TemplateListItem) => selected.name))
        }
        color="danger"
      >
        <FormattedMessage
          id="xpack.idxMgmt.templateList.table.deleteTemplatesButtonLabel"
          defaultMessage="Delete {count, plural, one {template} other {templates} }"
          values={{ count: selection.length }}
        />
      </EuiButton>
    ),
    toolsRight: [
      <EuiButton
        color="secondary"
        iconType="refresh"
        onClick={reload}
        data-test-subj="reloadButton"
        key="reloadButton"
      >
        <FormattedMessage
          id="xpack.idxMgmt.templateList.table.reloadTemplatesButtonLabel"
          defaultMessage="Reload"
        />
      </EuiButton>,
      <EuiButton
        href={`#${BASE_PATH}create_template`}
        fill
        iconType="plusInCircle"
        data-test-subj="createTemplateButton"
        key="createTemplateButton"
      >
        <FormattedMessage
          id="xpack.idxMgmt.templateList.table.createTemplatesButtonLabel"
          defaultMessage="Create a template"
        />
      </EuiButton>,
    ],
  };

  return (
    <Fragment>
      {templatesToDelete && templatesToDelete.length > 0 ? (
        <TemplateDeleteModal
          callback={data => {
            if (data && data.hasDeletedTemplates) {
              reload();
            } else {
              setTemplatesToDelete([]);
            }
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
        isSelectable={true}
        selection={selectionConfig}
        pagination={pagination}
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
