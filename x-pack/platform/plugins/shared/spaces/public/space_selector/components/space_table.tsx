/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import React, { Component, lazy, Suspense } from 'react';

import { i18n } from '@kbn/i18n';

import type { Space } from '../../../common';
import { addSpaceIdToPath, ENTER_SPACE_PATH } from '../../../common';
import { getSpaceAvatarComponent } from '../../space_avatar';
import { SpaceSolutionBadge } from '../../space_solution_badge';

// Lazy load the space avatar component
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  spaces: Space[];
  serverBasePath: string;
  loading?: boolean;
}

interface State {
  pageIndex: number;
  pageSize: number;
  sortField?: keyof Space;
  sortDirection?: 'asc' | 'desc';
}

export class SpaceTable extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      pageIndex: 0,
      pageSize: 10,
      sortField: 'name',
      sortDirection: 'asc',
    };
  }

  private onTableChange = ({ page, sort }: any) => {
    if (page) {
      this.setState({
        pageIndex: page.index,
        pageSize: page.size,
      });
    }

    if (sort) {
      this.setState({
        sortField: sort.field,
        sortDirection: sort.direction,
      });
    }
  };

  private renderSpaceAvatar = (space: Space) => {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="s" />}>
        <LazySpaceAvatar space={space} size="s" announceSpaceName={false} />
      </Suspense>
    );
  };

  private renderSpaceName = (space: Space) => {
    const spaceUrl = addSpaceIdToPath(this.props.serverBasePath, space.id, ENTER_SPACE_PATH);

    return (
      <EuiLink href={spaceUrl} data-test-subj={`space-link-${space.id}`}>
        <EuiText size="s">
          <strong>{space.name}</strong>
        </EuiText>
      </EuiLink>
    );
  };

  private renderSpaceDescription = (space: Space) => {
    const description = space.description || '';

    if (!description) {
      return null;
    }

    // Use simple text display like the working card view
    return (
      <EuiTextColor color="subdued" className="eui-textBreakWord">
        <EuiText size="s">{description}</EuiText>
      </EuiTextColor>
    );
  };

  private renderSpaceSolution = (space: Space) => {
    if (!space.solution) {
      return null;
    }

    return <SpaceSolutionBadge solution={space.solution} />;
  };

  public render() {
    const { spaces, loading } = this.props;
    const { pageIndex, pageSize, sortField, sortDirection } = this.state;

    // Sort spaces
    const sortedSpaces = spaces.slice().sort((a, b) => {
      if (!sortField) return 0;

      const aValue = String(a[sortField] || '');
      const bValue = String(b[sortField] || '');

      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    // Paginate spaces
    const startIndex = pageIndex * pageSize;
    const paginatedSpaces = sortedSpaces.slice(startIndex, startIndex + pageSize);

    const columns: Array<EuiBasicTableColumn<Space>> = [
      {
        field: 'name',
        name: '',
        width: '48px',
        render: (name: string, space: Space) => this.renderSpaceAvatar(space),
      },
      {
        field: 'name',
        name: i18n.translate('xpack.spaces.spaceTable.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: (name: string, space: Space) => this.renderSpaceName(space),
        width: '30%',
      },
      {
        field: 'description',
        name: i18n.translate('xpack.spaces.spaceTable.descriptionColumnTitle', {
          defaultMessage: 'Description',
        }),
        render: (description: string, space: Space) => this.renderSpaceDescription(space),
        width: '45%',
      },
      {
        field: 'solution',
        name: i18n.translate('xpack.spaces.spaceTable.solutionColumnTitle', {
          defaultMessage: 'Solution',
        }),
        render: (solution: string, space: Space) => this.renderSpaceSolution(space),
        width: '180px',
      },
    ];

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount: spaces.length,
      pageSizeOptions: [10, 25, 50, 100],
    };

    const sorting = {
      sort:
        sortField && sortDirection
          ? {
              field: sortField,
              direction: sortDirection,
            }
          : undefined,
    };

    return (
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.spaces.spaceTable.tableCaption', {
          defaultMessage: 'Available spaces',
        })}
        items={paginatedSpaces}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        onChange={this.onTableChange}
        loading={loading}
        data-test-subj="spacesTable"
        rowProps={(space: Space) => ({
          'data-test-subj': `space-table-row-${space.id}`,
        })}
      />
    );
  }
}
