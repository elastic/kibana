/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { EuiInMemoryTableProps, EuiSearchBarOnChangeArgs } from '@elastic/eui';
import {
  EuiInMemoryTable,
  EuiButton,
  EuiLink,
  EuiLoadingLogo,
  EuiOverlayMask,
  EuiHealth,
} from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { API_STATUS, UIM_AUTO_FOLLOW_PATTERN_SHOW_DETAILS_CLICK } from '../../../../../constants';
import {
  AutoFollowPatternDeleteProvider,
  AutoFollowPatternActionMenu,
} from '../../../../../components';
import { routing } from '../../../../../services/routing';
import { trackUiMetric } from '../../../../../services/track_ui_metric';
import type { ApiStatus } from '../../../../../../../common/types';
import type { ParsedAutoFollowPattern } from '../../../../../store/reducers/auto_follow_pattern';

const actionI18nTexts = {
  pause: i18n.translate(
    'xpack.crossClusterReplication.autoFollowPatternList.table.actionPauseDescription',
    {
      defaultMessage: 'Pause replication',
    }
  ),
  resume: i18n.translate(
    'xpack.crossClusterReplication.autoFollowPatternList.table.actionResumeDescription',
    {
      defaultMessage: 'Resume replication',
    }
  ),
  edit: i18n.translate(
    'xpack.crossClusterReplication.autoFollowPatternList.table.actionEditDescription',
    {
      defaultMessage: 'Edit auto-follow pattern',
    }
  ),
  delete: i18n.translate(
    'xpack.crossClusterReplication.autoFollowPatternList.table.actionDeleteDescription',
    {
      defaultMessage: 'Delete auto-follow pattern',
    }
  ),
};

const getFilteredPatterns = (
  autoFollowPatterns: ParsedAutoFollowPattern[],
  queryText: string
): ParsedAutoFollowPattern[] => {
  if (queryText) {
    const normalizedSearchText = queryText.toLowerCase();

    return autoFollowPatterns.filter((autoFollowPattern) => {
      // default values to avoid undefined errors
      const {
        name = '',
        remoteCluster = '',
        followIndexPatternPrefix = '',
        followIndexPatternSuffix = '',
      } = autoFollowPattern;

      const inName = name.toLowerCase().includes(normalizedSearchText);
      const inRemoteCluster = remoteCluster.toLowerCase().includes(normalizedSearchText);
      const inPrefix = followIndexPatternPrefix.toLowerCase().includes(normalizedSearchText);
      const inSuffix = followIndexPatternSuffix.toLowerCase().includes(normalizedSearchText);

      return inName || inRemoteCluster || inPrefix || inSuffix;
    });
  }

  return autoFollowPatterns;
};

export interface AutoFollowPatternTableProps {
  autoFollowPatterns: ParsedAutoFollowPattern[];
  selectAutoFollowPattern: (name: string) => void;
  pauseAutoFollowPattern: (name: string) => void;
  resumeAutoFollowPattern: (name: string) => void;
  apiStatusDelete: ApiStatus;
}

interface AutoFollowPatternTableState {
  prevAutoFollowPatterns: ParsedAutoFollowPattern[];
  selectedItems: string[];
  filteredAutoFollowPatterns: ParsedAutoFollowPattern[];
  queryText: string;
}

export class AutoFollowPatternTable extends PureComponent<
  AutoFollowPatternTableProps,
  AutoFollowPatternTableState
> {
  static getDerivedStateFromProps(
    props: AutoFollowPatternTableProps,
    state: AutoFollowPatternTableState
  ): Partial<AutoFollowPatternTableState> | null {
    const { autoFollowPatterns } = props;
    const { prevAutoFollowPatterns, queryText } = state;

    // If an auto-follow pattern gets deleted, we need to recreate the cached filtered auto-follow patterns.
    if (prevAutoFollowPatterns !== autoFollowPatterns) {
      return {
        prevAutoFollowPatterns: autoFollowPatterns,
        filteredAutoFollowPatterns: getFilteredPatterns(autoFollowPatterns, queryText),
      };
    }

    return null;
  }

  constructor(props: AutoFollowPatternTableProps) {
    super(props);

    this.state = {
      prevAutoFollowPatterns: props.autoFollowPatterns,
      selectedItems: [],
      filteredAutoFollowPatterns: props.autoFollowPatterns,
      queryText: '',
    };
  }

  onSearch = ({ query, queryText }: EuiSearchBarOnChangeArgs) => {
    const { autoFollowPatterns } = this.props;
    const text = query?.text ?? queryText;

    // We cache the filtered indices instead of calculating them inside render() because
    // of https://github.com/elastic/eui/issues/3445.
    this.setState({
      queryText: text,
      filteredAutoFollowPatterns: getFilteredPatterns(autoFollowPatterns, text),
    });
  };

  getTableColumns(
    deleteAutoFollowPattern: (name: string) => void
  ): EuiInMemoryTableProps<ParsedAutoFollowPattern>['columns'] {
    const { selectAutoFollowPattern } = this.props;

    return [
      {
        field: 'name',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.nameColumnTitle',
          {
            defaultMessage: 'Name',
          }
        ),
        sortable: true,
        truncateText: false,
        render: (name: string) => {
          return (
            <EuiLink
              onClick={() => {
                trackUiMetric('click', UIM_AUTO_FOLLOW_PATTERN_SHOW_DETAILS_CLICK);
                selectAutoFollowPattern(name);
              }}
              data-test-subj="autoFollowPatternLink"
            >
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'active',
        dataType: 'boolean',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.statusTitle',
          {
            defaultMessage: 'Status',
          }
        ),
        render: (active: boolean) => {
          const statusText = active
            ? i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternList.table.statusTextActive',
                { defaultMessage: 'Active' }
              )
            : i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternList.table.statusTextPaused',
                { defaultMessage: 'Paused' }
              );

          return (
            <>
              <EuiHealth color={active ? 'success' : 'subdued'} />
              &nbsp;{statusText}
            </>
          );
        },
        sortable: true,
      },
      {
        field: 'remoteCluster',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.clusterColumnTitle',
          {
            defaultMessage: 'Remote cluster',
          }
        ),
        truncateText: true,
        sortable: true,
      },
      {
        field: 'leaderIndexPatterns',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.leaderPatternsColumnTitle',
          {
            defaultMessage: 'Leader patterns',
          }
        ),
        render: (leaderIndexPatterns: string[]) => leaderIndexPatterns.join(', '),
      },
      {
        field: 'followIndexPatternPrefix',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.prefixColumnTitle',
          {
            defaultMessage: 'Follower index prefix',
          }
        ),
        sortable: true,
      },
      {
        field: 'followIndexPatternSuffix',
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.suffixColumnTitle',
          {
            defaultMessage: 'Follower index suffix',
          }
        ),
        sortable: true,
      },
      {
        name: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternList.table.actionsColumnTitle',
          {
            defaultMessage: 'Actions',
          }
        ),
        actions: [
          {
            type: 'icon',
            name: actionI18nTexts.pause,
            description: actionI18nTexts.pause,
            icon: 'pause',
            onClick: (item: ParsedAutoFollowPattern) =>
              this.props.pauseAutoFollowPattern(item.name),
            available: (item: ParsedAutoFollowPattern) => item.active,
            'data-test-subj': 'contextMenuPauseButton',
          },
          {
            type: 'icon',
            name: actionI18nTexts.resume,
            description: actionI18nTexts.resume,
            icon: 'play',
            onClick: (item: ParsedAutoFollowPattern) =>
              this.props.resumeAutoFollowPattern(item.name),
            available: (item: ParsedAutoFollowPattern) => !item.active,
            'data-test-subj': 'contextMenuResumeButton',
          },
          {
            type: 'icon',
            name: actionI18nTexts.edit,
            description: actionI18nTexts.edit,
            icon: 'pencil',
            onClick: (item: ParsedAutoFollowPattern) =>
              routing.navigate(routing.getAutoFollowPatternPath(item.name)),
            'data-test-subj': 'contextMenuEditButton',
          },
          {
            type: 'icon',
            name: actionI18nTexts.delete,
            description: actionI18nTexts.delete,
            icon: 'trash',
            onClick: (item: ParsedAutoFollowPattern) => deleteAutoFollowPattern(item.name),
            'data-test-subj': 'contextMenuDeleteButton',
          },
        ],
        width: '100px',
      },
    ];
  }

  renderLoading = () => {
    const { apiStatusDelete } = this.props;

    if (apiStatusDelete === API_STATUS.DELETING) {
      return (
        <EuiOverlayMask>
          <EuiLoadingLogo logo="logoKibana" size="xl" />
        </EuiOverlayMask>
      );
    }
    return null;
  };

  render() {
    const { selectedItems, filteredAutoFollowPatterns } = this.state;
    const reactRouter = routing.reactRouterOrThrow;

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc' as const,
      },
    };

    const pagination = {
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50],
    };

    const selection = {
      onSelectionChange: (rows: ParsedAutoFollowPattern[]) =>
        this.setState({ selectedItems: rows.map(({ name }) => name) }),
    };

    const search: EuiInMemoryTableProps<ParsedAutoFollowPattern>['search'] = {
      toolsLeft: selectedItems.length ? (
        <AutoFollowPatternActionMenu
          edit={false}
          arrowDirection="down"
          patterns={this.state.selectedItems
            .map((name) => filteredAutoFollowPatterns.find((item) => item.name === name))
            .filter((p): p is ParsedAutoFollowPattern => p !== undefined)}
        />
      ) : undefined,
      toolsRight: (
        <EuiButton
          {...reactRouterNavigate(reactRouter.history, `/auto_follow_patterns/add`)}
          fill
          iconType="plusCircle"
          data-test-subj="createAutoFollowPatternButton"
        >
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPatternList.addAutoFollowPatternButtonLabel"
            defaultMessage="Create an auto-follow pattern"
          />
        </EuiButton>
      ),
      onChange: this.onSearch,
      box: {
        incremental: true,
        'data-test-subj': 'autoFollowPatternSearch',
      },
    };

    return (
      <AutoFollowPatternDeleteProvider>
        {(deleteAutoFollowPattern) => (
          <>
            <EuiInMemoryTable
              items={filteredAutoFollowPatterns}
              itemId="name"
              columns={this.getTableColumns(deleteAutoFollowPattern)}
              search={search}
              pagination={pagination}
              sorting={sorting}
              selection={selection}
              rowProps={() => ({
                'data-test-subj': 'row',
              })}
              cellProps={(item, column) => ({
                'data-test-subj': `cell_${'field' in column ? column.field : ''}`,
              })}
              data-test-subj="autoFollowPatternListTable"
              tableCaption={i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternList.tableCaption',
                {
                  defaultMessage: 'List of auto-follow patterns',
                }
              )}
            />
            {this.renderLoading()}
          </>
        )}
      </AutoFollowPatternDeleteProvider>
    );
  }
}
