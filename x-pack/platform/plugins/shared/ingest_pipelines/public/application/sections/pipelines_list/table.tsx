/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useMemo, useEffect } from 'react';
import qs from 'query-string';
import { i18n } from '@kbn/i18n';
import { isEmpty, omit } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { parse } from 'query-string';

import {
  EuiInMemoryTable,
  EuiLink,
  EuiButton,
  EuiButtonIcon,
  EuiInMemoryTableProps,
  EuiTableFieldDataColumnType,
  EuiPopover,
  EuiBadge,
  EuiToolTip,
  EuiFilterGroup,
  EuiSelectable,
  EuiFilterButton,
  EuiSelectableOption,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';

import { useEuiTablePersist } from '@kbn/shared-ux-table-persist';
import { Pipeline } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';

export interface Props {
  pipelines: Pipeline[];
  onReloadClick: () => void;
  isLoading: boolean;
  onEditPipelineClick: (pipelineName: string) => void;
  onClonePipelineClick: (pipelineName: string) => void;
  onDeletePipelineClick: (pipelineName: Pipeline[]) => void;
}

export const deprecatedPipelineBadge = {
  badge: i18n.translate('xpack.ingestPipelines.list.table.deprecatedBadgeLabel', {
    defaultMessage: 'Deprecated',
  }),
  badgeTooltip: i18n.translate('xpack.ingestPipelines.list.table.deprecatedBadgeTooltip', {
    defaultMessage:
      'This pipeline is no longer supported and might be removed in a future release. Instead, use one of the other pipelines available or create a new one.',
  }),
};

const deprecatedFilterLabel = i18n.translate(
  'xpack.ingestPipelines.list.table.deprecatedFilterLabel',
  {
    defaultMessage: 'Deprecated',
  }
);

const managedFilterLabel = i18n.translate('xpack.ingestPipelines.list.table.managedFilterLabel', {
  defaultMessage: 'Managed',
});

const defaultFilterOptions: EuiSelectableOption[] = [
  { key: 'managed', label: managedFilterLabel, 'data-test-subj': 'managedFilter' },
  {
    key: 'deprecated',
    label: deprecatedFilterLabel,
    checked: 'off',
    'data-test-subj': 'deprecatedFilter',
  },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface FilterQueryParams {
  [key: string]: 'unset' | 'on' | 'off';
}

export function serializeFilterOptions(options: EuiSelectableOption[]) {
  return options.reduce((list, option) => {
    return {
      ...list,
      [option.key as string]: option.checked ?? 'unset',
    };
  }, {}) as FilterQueryParams;
}

export function deserializeFilterOptions(options: FilterQueryParams) {
  return defaultFilterOptions.map((filter: EuiSelectableOption) => {
    const filterKey = filter.key ? filter.key : '';
    return {
      // Ignore checked property when setting as we are going to handle that separately
      ...omit(filter, ['checked']),
      ...(options[filterKey] === 'unset' ? {} : { checked: options[filterKey] }),
    };
  }) as EuiSelectableOption[];
}

function isDefaultFilterOptions(options: FilterQueryParams) {
  return options.managed === 'unset' && options.deprecated === 'off';
}

export const PipelineTable: FunctionComponent<Props> = ({
  pipelines,
  isLoading,
  onReloadClick,
  onEditPipelineClick,
  onClonePipelineClick,
  onDeletePipelineClick,
}) => {
  const [queryText, setQueryText] = useState<string>('');
  const [filterOptions, setFilterOptions] = useState<EuiSelectableOption[]>(defaultFilterOptions);

  const { history } = useKibana().services;
  const [selection, setSelection] = useState<Pipeline[]>([]);

  const { pageSize, sorting, onTableChange } = useEuiTablePersist<Pipeline>({
    tableId: 'ingestPipelines',
    initialPageSize: 10,
    initialSort: { field: 'name', direction: 'asc' },
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });
  const filteredPipelines = useMemo(() => {
    // Filter pipelines list by whatever the user entered in the search bar
    const pipelinesAfterSearch = (pipelines || []).filter((pipeline) => {
      return pipeline.name.toLowerCase().includes(queryText.toLowerCase());
    });

    // Then filter those results down with the selected options from the filter dropdown
    return pipelinesAfterSearch.filter((pipeline) => {
      const deprecatedFilter = filterOptions.find(({ key }) => key === 'deprecated')?.checked;
      const managedFilter = filterOptions.find(({ key }) => key === 'managed')?.checked;
      return !(
        (deprecatedFilter === 'off' && pipeline.deprecated) ||
        (deprecatedFilter === 'on' && !pipeline.deprecated) ||
        (managedFilter === 'off' && pipeline.isManaged) ||
        (managedFilter === 'on' && !pipeline.isManaged)
      );
    });
  }, [pipelines, filterOptions, queryText]);

  // This effect will run once only to update the initial state of the filters
  // and queryText based on whatever is set in the query params.
  useEffect(() => {
    const {
      queryText: searchQuery,
      deprecated,
      managed,
    } = qs.parse(history?.location?.search || '');
    if (searchQuery) {
      setQueryText(searchQuery as string);
    }
    if (deprecated && managed) {
      setFilterOptions(
        deserializeFilterOptions({
          deprecated,
          managed,
        } as FilterQueryParams)
      );
    }
  }, [history]);

  useEffect(() => {
    const serializedFilterOptions = serializeFilterOptions(filterOptions);
    const isQueryEmpty = isEmpty(queryText);
    const isDefaultFilters = isDefaultFilterOptions(serializedFilterOptions);
    const isDefaultFilterConfiguration = isQueryEmpty && isDefaultFilters;

    if (!isDefaultFilterConfiguration) {
      const { pipeline } = parse(location.search.substring(1));
      history.push({
        pathname: '',
        search:
          '?' +
          qs.stringify(
            {
              ...(!isQueryEmpty ? { queryText } : {}),
              ...(!isDefaultFilters ? serializedFilterOptions : {}),
              ...(pipeline ? { pipeline } : {}),
            },
            { strict: false, arrayFormat: 'index' }
          ),
      });
    }
  }, [history, queryText, filterOptions]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };
  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      badgeColor="success"
      data-test-subj="filtersDropdown"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={filterOptions.filter((item) => item.checked !== 'off').length}
      hasActiveFilters={!!filterOptions.find((item) => item.checked === 'on')}
      numActiveFilters={filterOptions.filter((item) => item.checked === 'on').length}
    >
      {i18n.translate('xpack.ingestPipelines.list.table.filtersButtonLabel', {
        defaultMessage: 'Filters',
      })}
    </EuiFilterButton>
  );

  const tableProps: EuiInMemoryTableProps<Pipeline> = {
    itemId: 'name',
    'data-test-subj': 'pipelinesTable',
    sorting,
    selection: {
      onSelectionChange: setSelection,
    },
    rowProps: () => ({
      'data-test-subj': 'pipelineTableRow',
    }),
    cellProps: (pipeline, column) => {
      const { field } = column as EuiTableFieldDataColumnType<Pipeline>;

      return {
        'data-test-subj': `pipelineTableRow-${field}`,
      };
    },
    search: {
      query: queryText,
      onChange: ({ queryText: searchText, error }) => {
        if (!error) {
          setQueryText(searchText);
        }
      },
      toolsLeft:
        selection.length > 0 ? (
          <EuiButton
            data-test-subj="deletePipelinesButton"
            onClick={() => onDeletePipelineClick(selection)}
            color="danger"
          >
            <FormattedMessage
              id="xpack.ingestPipelines.list.table.deletePipelinesButtonLabel"
              defaultMessage="Delete {count, plural, one {pipeline} other {pipelines} }"
              values={{ count: selection.length }}
            />
          </EuiButton>
        ) : undefined,
      toolsRight: [
        <EuiButtonIcon
          key="reloadButton"
          iconType="refresh"
          color="success"
          aria-label="refresh button"
          data-test-subj="reloadButton"
          size="m"
          display="base"
          onClick={onReloadClick}
        />,
      ],
      box: {
        incremental: true,
        'data-test-subj': 'pipelineTableSearch',
      },
      filters: [
        {
          type: 'custom_component',
          component: () => {
            return (
              <EuiFilterGroup>
                <EuiPopover
                  id="popoverID"
                  button={button}
                  isOpen={isPopoverOpen}
                  closePopover={closePopover}
                  panelPaddingSize="none"
                >
                  <EuiSelectable
                    allowExclusions
                    aria-label={i18n.translate(
                      'xpack.ingestPipelines.list.table.filtersAriaLabel',
                      {
                        defaultMessage: 'Filters',
                      }
                    )}
                    options={filterOptions as EuiSelectableOption[]}
                    onChange={setFilterOptions}
                  >
                    {(list) => <div style={{ width: 300 }}>{list}</div>}
                  </EuiSelectable>
                </EuiPopover>
              </EuiFilterGroup>
            );
          },
        },
      ],
    },
    pagination: {
      initialPageSize: pageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    },
    onTableChange,
    columns: [
      {
        width: '25%',
        field: 'name',
        name: i18n.translate('xpack.ingestPipelines.list.table.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: (name: string) => {
          const currentSearch = history.location.search;
          const prependSearch = isEmpty(currentSearch) ? '?' : `${currentSearch}&`;

          return (
            <EuiLink
              data-test-subj="pipelineDetailsLink"
              {...reactRouterNavigate(history, {
                pathname: '',
                search: `${prependSearch}pipeline=${encodeURIComponent(name)}`,
              })}
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        width: '100px',
        render: (pipeline: Pipeline) => {
          return (
            <EuiFlexGroup direction="column" gutterSize="xs" alignItems="center">
              {pipeline.isManaged && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow" data-test-subj="isManagedBadge">
                    {i18n.translate('xpack.ingestPipelines.list.table.managedBadgeLabel', {
                      defaultMessage: 'Managed',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              )}
              {pipeline.deprecated && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={deprecatedPipelineBadge.badgeTooltip}>
                    <EuiBadge color="warning" data-test-subj="isDeprecatedBadge">
                      {deprecatedPipelineBadge.badge}
                    </EuiBadge>
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'description',
        sortable: true,
        name: i18n.translate('xpack.ingestPipelines.list.table.descriptionColumnTitle', {
          defaultMessage: 'Description',
        }),
      },
      {
        width: '120px',
        name: i18n.translate('xpack.ingestPipelines.list.table.preprocessorsColumnTitle', {
          defaultMessage: 'Preprocessors',
        }),
        align: 'right',
        dataType: 'number',
        sortable: ({ processors }: Pipeline) => processors.length,
        render: ({ processors }: Pipeline) => processors.length,
      },
      {
        width: '120px',
        name: (
          <FormattedMessage
            id="xpack.ingestPipelines.list.table.actionColumnTitle"
            defaultMessage="Actions"
          />
        ),
        actions: [
          {
            isPrimary: true,
            name: i18n.translate('xpack.ingestPipelines.list.table.editActionLabel', {
              defaultMessage: 'Edit',
            }),
            description: i18n.translate('xpack.ingestPipelines.list.table.editActionDescription', {
              defaultMessage: 'Edit this pipeline',
            }),
            type: 'icon',
            icon: 'pencil',
            onClick: ({ name }) => onEditPipelineClick(name),
          },
          {
            name: i18n.translate('xpack.ingestPipelines.list.table.cloneActionLabel', {
              defaultMessage: 'Clone',
            }),
            description: i18n.translate('xpack.ingestPipelines.list.table.cloneActionDescription', {
              defaultMessage: 'Clone this pipeline',
            }),
            type: 'icon',
            icon: 'copy',
            onClick: ({ name }) => onClonePipelineClick(name),
          },
          {
            isPrimary: true,
            name: i18n.translate('xpack.ingestPipelines.list.table.deleteActionLabel', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate(
              'xpack.ingestPipelines.list.table.deleteActionDescription',
              { defaultMessage: 'Delete this pipeline' }
            ),
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            onClick: (pipeline) => onDeletePipelineClick([pipeline]),
          },
        ],
      },
    ],
    items: filteredPipelines,
    loading: isLoading,
  };

  return <EuiInMemoryTable {...tableProps} />;
};
