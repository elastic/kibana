/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiInMemoryTable, EuiIcon, EuiButton, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { Template } from '../../../../../common/types';
import { DeleteTemplatesModal } from '../../../../components';

interface Props {
  templates: Template[];
  reload: () => Promise<void>;
}

const Checkmark = ({ tableCellData }: { tableCellData: object }) => {
  const isChecked = Object.entries(tableCellData).length > 0;

  if (isChecked) {
    return <EuiIcon type="check" />;
  }

  return null;
};

export const TemplatesTable: React.FunctionComponent<Props> = ({ templates, reload }) => {
  const [selection, setSelection] = useState<Template[]>([]);
  const [templatesToDelete, setTemplatesToDelete] = useState<Array<Template['name']>>([]);
  const [deletedTemplates, setDeletedTemplates] = useState<Array<Template['name']>>([]);

  const availableTemplates = useMemo(
    () =>
      templates
        ? templates.filter((template: Template) => !deletedTemplates.includes(template.name))
        : undefined,
    [templates, deletedTemplates]
  );

  const columns = [
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
      field: 'name',
      name: i18n.translate('xpack.idxMgmt.templatesList.table.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
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
    {
      name: i18n.translate('xpack.idxMgmt.templatesList.table.actionColumnTitle', {
        defaultMessage: 'Actions',
      }),
      width: '75px',
      actions: [
        {
          render: (template: Template) => {
            const { name } = template;
            const isSystemTemplate = name.startsWith('.');

            const label = isSystemTemplate
              ? i18n.translate(
                  'xpack.idxMgmt.templatesList.table.systemTemplateDeleteTooltipLabel',
                  {
                    defaultMessage: 'Cannot delete system templates',
                  }
                )
              : i18n.translate('xpack.idxMgmt.templatesList.table.actionDeleteTooltipLabel', {
                  defaultMessage: 'Delete',
                });

            return (
              <EuiToolTip content={label} delay="long">
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
                  isDisabled={isSystemTemplate}
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
    initialPageSize: 10,
    pageSizeOptions: [10, 20, 50],
  };

  const selectionConfig = {
    onSelectionChange: setSelection,
    selectable: (template: Template) => !template.name.startsWith('.'),
    selectableMessage: (selectable: boolean) =>
      !selectable
        ? i18n.translate('xpack.idxMgmt.templatesList.table.disabledTemplateTooltipText', {
            defaultMessage: 'System templates are read-only',
          })
        : undefined,
  };

  const searchConfig = {
    box: {
      incremental: true,
    },
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
            setDeletedTemplates([...deletedTemplates, ...templatesToDelete]);
          }
          setTemplatesToDelete([]);
        }}
        templatesToDelete={templatesToDelete}
      />
      <EuiInMemoryTable
        items={availableTemplates}
        itemId="name"
        columns={columns}
        search={searchConfig}
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
