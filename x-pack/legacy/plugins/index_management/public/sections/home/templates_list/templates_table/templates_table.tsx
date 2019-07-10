/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiInMemoryTable,
  EuiIcon,
  EuiButton,
  EuiToolTip,
  EuiButtonIcon,
  EuiLink,
} from '@elastic/eui';
import { Template } from '../../../../../common/types';
import { BASE_PATH, UIM_TEMPLATE_SHOW_DETAILS_CLICK } from '../../../../../common/constants';
import { DeleteTemplatesModal } from '../../../../components';
import { trackUiMetric } from '../../../../services/track_ui_metric';

interface Props {
  templates: Template[];
  reload: () => Promise<void>;
}

const Checkmark = ({ tableCellData }: { tableCellData: object }) => {
  const isChecked = Object.entries(tableCellData).length > 0;

  return isChecked ? <EuiIcon type="check" /> : null;
};

export const TemplatesTable: React.FunctionComponent<Props> = ({ templates, reload }) => {
  const [selection, setSelection] = useState<Template[]>([]);
  const [templatesToDelete, setTemplatesToDelete] = useState<Array<Template['name']>>([]);

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
      render: (name: Template['name']) => {
        return (
          <EuiLink
            href={`#${BASE_PATH}templates/${name}`}
            data-test-subj="templateDetailsLink"
            onClick={trackUiMetric.bind(null, UIM_TEMPLATE_SHOW_DETAILS_CLICK)}
          >
            {name}
          </EuiLink>
        );
      },
    },
    {
      field: 'indexPatterns',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.indexPatternsColumnTitle', {
        defaultMessage: 'Index patterns',
      }),
      truncateText: true,
      sortable: true,
      render: (indexPatterns: string[]) => <strong>{indexPatterns.join(', ')}</strong>,
    },
    {
      field: 'settings',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.ilmPolicyColumnTitle', {
        defaultMessage: 'ILM policy',
      }),
      truncateText: true,
      sortable: true,
      render: (settings?: {
        index: {
          lifecycle: {
            name: string;
          };
        };
      }) => {
        if (settings && settings.index && settings.index.lifecycle) {
          return settings.index.lifecycle.name;
        }
        return null;
      },
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
    {
      name: i18n.translate('xpack.idxMgmt.templatesList.table.actionColumnTitle', {
        defaultMessage: 'Actions',
      }),
      width: '75px',
      actions: [
        {
          render: (template: Template) => {
            const { name } = template;

            return (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.idxMgmt.templatesList.table.actionDeleteTooltipLabel',
                  {
                    defaultMessage: 'Delete',
                  }
                )}
                delay="long"
              >
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.idxMgmt.templatesList.table.actionDeleteAriaLabel',
                    {
                      defaultMessage: "Delete template '{name}'",
                      values: { name },
                    }
                  )}
                  iconType="trash"
                  color="danger"
                  onClick={() => {
                    setTemplatesToDelete([name]);
                  }}
                  data-test-subj="deleteTemplateButton"
                />
              </EuiToolTip>
            );
          },
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
  };

  const searchConfig = {
    box: {
      incremental: true,
    },
    filters: [
      {
        type: 'is',
        field: 'settings.index.lifecycle.name',
        name: i18n.translate('xpack.idxMgmt.templatesList.table.ilmPolicyFilterLabel', {
          defaultMessage: 'ILM policy',
        }),
      },
    ],
    toolsLeft: selection.length && (
      <EuiButton
        data-test-subj="deleteTemplatesButton"
        onClick={() => setTemplatesToDelete(selection.map((selected: Template) => selected.name))}
        color="danger"
      >
        <FormattedMessage
          id="xpack.idxMgmt.templatesList.table.deleteTemplatesButtonLabel"
          defaultMessage="Delete {count, plural, one {template} other {templates} }"
          values={{ count: selection.length }}
        />
      </EuiButton>
    ),
    toolsRight: (
      <EuiButton
        color="secondary"
        iconType="refresh"
        onClick={reload}
        data-test-subj="reloadButton"
      >
        <FormattedMessage
          id="xpack.idxMgmt.templatesList.table.reloadTemplatesButtonLabel"
          defaultMessage="Reload"
        />
      </EuiButton>
    ),
  };

  return (
    <Fragment>
      <DeleteTemplatesModal
        callback={data => {
          if (data && data.hasDeletedTemplates) {
            reload();
          }
          setTemplatesToDelete([]);
        }}
        templatesToDelete={templatesToDelete}
      />
      <EuiInMemoryTable
        items={templates}
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
        data-test-subj="templatesTable"
        message={
          <FormattedMessage
            id="xpack.idxMgmt.templatesList.table.noIndexTemplatesMessage"
            defaultMessage="No templates found"
          />
        }
      />
    </Fragment>
  );
};
