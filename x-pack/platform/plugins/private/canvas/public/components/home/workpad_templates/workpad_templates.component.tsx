/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { uniq } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiSearchBarProps,
  SearchFilterConfig,
} from '@elastic/eui';

import { CanvasTemplate } from '../../../../types';
import { tagsRegistry } from '../../../lib/tags_registry';
import { TagList } from '../../tag_list';

export interface Props {
  templates: CanvasTemplate[];
  onCreateWorkpad: (template: CanvasTemplate) => void;
}

export const WorkpadTemplates = ({ templates, onCreateWorkpad }: Props) => {
  const columns: Array<EuiBasicTableColumn<CanvasTemplate>> = [
    {
      field: 'name',
      name: strings.getTableNameColumnTitle(),
      sortable: true,
      width: '30%',
      dataType: 'string',
      render: (name: string, template) => {
        const templateName = name.length ? name : 'Unnamed Template';

        return (
          <EuiButtonEmpty
            onClick={() => onCreateWorkpad(template)}
            aria-label={strings.getCloneTemplateLinkAriaLabel(templateName)}
            type="button"
          >
            {templateName}
          </EuiButtonEmpty>
        );
      },
    },
    {
      field: 'help',
      name: strings.getTableDescriptionColumnTitle(),
      sortable: false,
      dataType: 'string',
      width: '30%',
    },
    {
      field: 'tags',
      name: strings.getTableTagsColumnTitle(),
      sortable: false,
      dataType: 'string',
      width: '30%',
      render: (tags: string[]) => <TagList tags={tags} tagType="health" />,
    },
  ];

  let uniqueTagNames: string[] = [];

  templates.forEach((template) => {
    const { tags } = template;
    tags.forEach((tag) => uniqueTagNames.push(tag));
    uniqueTagNames = uniq(uniqueTagNames);
  });

  const uniqueTags = uniqueTagNames.map(
    (name) =>
      tagsRegistry.get(name) || {
        color: undefined,
        name,
      }
  );

  const filters: SearchFilterConfig[] = [
    {
      type: 'field_value_selection',
      field: 'tags',
      name: 'Tags',
      multiSelect: true,
      options: uniqueTags.map((tag) => ({
        value: tag.name,
        name: tag.name,
        view: <TagList tags={[tag.name]} tagType="health" />,
      })),
    },
  ];

  const search: EuiSearchBarProps = {
    box: {
      incremental: true,
      schema: true,
    },
    filters,
  };

  return (
    <EuiInMemoryTable
      itemId="id"
      items={templates}
      columns={columns}
      search={search}
      sorting={{
        sort: {
          field: 'name',
          direction: 'asc',
        },
      }}
      pagination={true}
      data-test-subj="canvasTemplatesTable"
    />
  );
};

const strings = {
  getCloneTemplateLinkAriaLabel: (templateName: string) =>
    i18n.translate('xpack.canvas.workpadTemplates.cloneTemplateLinkAriaLabel', {
      defaultMessage: `Clone workpad template ''{templateName}''`,
      values: {
        templateName,
      },
    }),
  getTableDescriptionColumnTitle: () =>
    i18n.translate('xpack.canvas.workpadTemplates.table.descriptionColumnTitle', {
      defaultMessage: 'Description',
    }),
  getTableNameColumnTitle: () =>
    i18n.translate('xpack.canvas.workpadTemplates.table.nameColumnTitle', {
      defaultMessage: 'Template name',
    }),
  getTableTagsColumnTitle: () =>
    i18n.translate('xpack.canvas.workpadTemplates.table.tagsColumnTitle', {
      defaultMessage: 'Tags',
      description:
        'This column contains relevant tags that indicate what type of template ' +
        'is displayed. For example: "report", "presentation", etc.',
    }),
  getTemplateSearchPlaceholder: () =>
    i18n.translate('xpack.canvas.workpadTemplates.searchPlaceholder', {
      defaultMessage: 'Find template',
    }),
  getCreatingTemplateLabel: (templateName: string) =>
    i18n.translate('xpack.canvas.workpadTemplates.creatingTemplateLabel', {
      defaultMessage: `Creating from template ''{templateName}''`,
      values: {
        templateName,
      },
    }),
};
