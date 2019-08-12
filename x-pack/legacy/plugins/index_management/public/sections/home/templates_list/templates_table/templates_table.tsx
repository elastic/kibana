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
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { TemplateListItem } from '../../../../../common/types';
import { BASE_PATH, UIM_TEMPLATE_SHOW_DETAILS_CLICK } from '../../../../../common/constants';
import { DeleteTemplatesModal } from '../../../../components';
import { trackUiMetric, METRIC_TYPE } from '../../../../services/track_ui_metric';

interface Props {
  templates: TemplateListItem[];
  reload: () => Promise<void>;
}

export const TemplatesTable: React.FunctionComponent<Props> = ({ templates, reload }) => {
  const [selection, setSelection] = useState<TemplateListItem[]>([]);
  const [templatesToDelete, setTemplatesToDelete] = useState<Array<TemplateListItem['name']>>([]);

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
      render: (name: TemplateListItem['name']) => {
        return (
          /* eslint-disable-next-line @elastic/eui/href-or-on-click */
          <EuiLink
            href={encodeURI(`#${BASE_PATH}templates/${name}`)}
            data-test-subj="templateDetailsLink"
            onClick={() => trackUiMetric(METRIC_TYPE.CLICK, UIM_TEMPLATE_SHOW_DETAILS_CLICK)}
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
      field: 'ilmPolicy',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.ilmPolicyColumnTitle', {
        defaultMessage: 'ILM policy',
      }),
      truncateText: true,
      sortable: true,
      render: (ilmPolicy: { name: string }) =>
        ilmPolicy && ilmPolicy.name ? ilmPolicy.name : null,
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
      field: 'hasMappings',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.mappingsColumnTitle', {
        defaultMessage: 'Mappings',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (hasMappings: boolean) => (hasMappings ? <EuiIcon type="check" /> : null),
    },
    {
      field: 'hasSettings',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.settingsColumnTitle', {
        defaultMessage: 'Settings',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (hasSettings: boolean) => (hasSettings ? <EuiIcon type="check" /> : null),
    },
    {
      field: 'hasAliases',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.aliasesColumnTitle', {
        defaultMessage: 'Aliases',
      }),
      truncateText: true,
      sortable: true,
      width: '100px',
      render: (hasAliases: boolean) => (hasAliases ? <EuiIcon type="check" /> : null),
    },
    {
      name: i18n.translate('xpack.idxMgmt.templatesList.table.actionColumnTitle', {
        defaultMessage: 'Actions',
      }),
      width: '75px',
      actions: [
        {
          render: ({ name }: { name: TemplateListItem['name'] }) => {
            return (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.idxMgmt.templatesList.table.actionEditTooltipLabel',
                  { defaultMessage: 'Edit' }
                )}
              >
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.idxMgmt.templatesList.table.actionEditTooltipLabel',
                    {
                      defaultMessage: `Edit template '{name}'`,
                      values: { name },
                    }
                  )}
                  iconType="pencil"
                  color="primary"
                  href={`#${BASE_PATH}templates_edit/${encodeURIComponent(name)}`}
                  data-test-subj="editTemplateButton"
                />
              </EuiToolTip>
            );
          },
        },
        {
          render: ({ name }: { name: TemplateListItem['name'] }) => {
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
        field: 'ilmPolicy.name',
        name: i18n.translate('xpack.idxMgmt.templatesList.table.ilmPolicyFilterLabel', {
          defaultMessage: 'ILM policy',
        }),
      },
    ],
    toolsLeft: selection.length && (
      <EuiButton
        data-test-subj="deleteTemplatesButton"
        onClick={() =>
          setTemplatesToDelete(selection.map((selected: TemplateListItem) => selected.name))
        }
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
      <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
        <EuiFlexItem>
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
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            href={`#${BASE_PATH}templates_create`}
            fill
            iconType="plusInCircle"
            data-test-subj="createTemplateButton"
          >
            <FormattedMessage
              id="xpack.idxMgmt.templatesList.table.createTemplatesButtonLabel"
              defaultMessage="Create a template"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  };

  return (
    <Fragment>
      {templatesToDelete && templatesToDelete.length > 0 ? (
        <DeleteTemplatesModal
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
