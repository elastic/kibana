/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiBasicTable, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import moment from 'moment';
import React, { Component } from 'react';
import styled from 'styled-components';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { ErrorGroupListAPIResponse } from '../../../../../server/lib/errors/get_error_groups';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import {
  fontFamilyCode,
  fontSizes,
  px,
  truncate,
  unit
} from '../../../../style/variables';
import { APMLink } from '../../../shared/Links/APMLink';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { history } from '../../../../utils/history';

function paginateItems({
  items,
  pageIndex,
  pageSize
}: {
  items: any[];
  pageIndex: number;
  pageSize: number;
}) {
  return items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
}

const GroupIdLink = styled(APMLink)`
  font-family: ${fontFamilyCode};
`;

const MessageAndCulpritCell = styled.div`
  ${truncate('100%')};
`;

const MessageLink = styled(APMLink)`
  font-family: ${fontFamilyCode};
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

const Culprit = styled.div`
  font-family: ${fontFamilyCode};
`;

interface Props {
  location: Location;
  urlParams: IUrlParams;
  items: ErrorGroupListAPIResponse;
}

interface ITableChange {
  page: { index?: number; size?: number };
  sort: {
    field?: string;
    direction?: string;
  };
}

interface State {
  page: { index?: number; size?: number };
}

export class ErrorGroupList extends Component<Props, State> {
  public state = {
    page: {
      index: 0,
      size: 25
    }
  };

  public onTableChange = ({ page = {}, sort = {} }: ITableChange) => {
    this.setState({ page });

    const { location } = this.props;

    history.push({
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        sortField: sort.field,
        sortDirection: sort.direction
      })
    });
  };

  public render() {
    const { items } = this.props;
    const { serviceName, sortDirection, sortField } = this.props.urlParams;

    const paginatedItems = paginateItems({
      items,
      pageIndex: this.state.page.index,
      pageSize: this.state.page.size
    });

    const columns = [
      {
        name: i18n.translate('xpack.apm.errorsTable.groupIdColumnLabel', {
          defaultMessage: 'Group ID'
        }),
        field: 'groupId',
        sortable: false,
        width: px(unit * 6),
        render: (groupId: string) => {
          return (
            <GroupIdLink path={`/${serviceName}/errors/${groupId}`}>
              {groupId.slice(0, 5) || NOT_AVAILABLE_LABEL}
            </GroupIdLink>
          );
        }
      },
      {
        name: i18n.translate(
          'xpack.apm.errorsTable.errorMessageAndCulpritColumnLabel',
          {
            defaultMessage: 'Error message and culprit'
          }
        ),
        field: 'message',
        sortable: false,
        width: '50%',
        render: (message: string, item: ErrorGroupListAPIResponse[0]) => {
          return (
            <MessageAndCulpritCell>
              <EuiToolTip
                id="error-message-tooltip"
                content={message || NOT_AVAILABLE_LABEL}
              >
                <MessageLink path={`/${serviceName}/errors/${item.groupId}`}>
                  {message || NOT_AVAILABLE_LABEL}
                </MessageLink>
              </EuiToolTip>
              <br />
              <EuiToolTip
                id="error-culprit-tooltip"
                content={item.culprit || NOT_AVAILABLE_LABEL}
              >
                <Culprit>{item.culprit || NOT_AVAILABLE_LABEL}</Culprit>
              </EuiToolTip>
            </MessageAndCulpritCell>
          );
        }
      },
      {
        name: '',
        field: 'handled',
        sortable: false,
        align: 'right',
        render: (isUnhandled: boolean) =>
          isUnhandled === false && (
            <EuiBadge color="warning">
              {i18n.translate('xpack.apm.errorsTable.unhandledLabel', {
                defaultMessage: 'Unhandled'
              })}
            </EuiBadge>
          )
      },
      {
        name: i18n.translate('xpack.apm.errorsTable.occurrencesColumnLabel', {
          defaultMessage: 'Occurrences'
        }),
        field: 'occurrenceCount',
        sortable: true,
        dataType: 'number',
        render: (value?: number) =>
          value ? numeral(value).format('0.[0]a') : NOT_AVAILABLE_LABEL
      },
      {
        field: 'latestOccurrenceAt',
        sortable: true,
        name: i18n.translate(
          'xpack.apm.errorsTable.latestOccurrenceColumnLabel',
          {
            defaultMessage: 'Latest occurrence'
          }
        ),
        align: 'right',
        render: (value?: number) =>
          value ? moment(value).fromNow() : NOT_AVAILABLE_LABEL
      }
    ];

    return (
      <EuiBasicTable
        noItemsMessage={i18n.translate('xpack.apm.errorsTable.noErrorsLabel', {
          defaultMessage: 'No errors were found'
        })}
        items={paginatedItems}
        columns={columns}
        pagination={{
          pageIndex: this.state.page.index,
          pageSize: this.state.page.size,
          totalItemCount: this.props.items.length
        }}
        sorting={{
          sort: {
            field: sortField || 'latestOccurrenceAt',
            direction: sortDirection || 'desc'
          }
        }}
        onChange={this.onTableChange}
      />
    );
  }
}
