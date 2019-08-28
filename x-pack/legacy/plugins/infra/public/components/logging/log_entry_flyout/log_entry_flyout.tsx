/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { TimeKey } from '../../../../common/time';
import { InfraLogItem, InfraLogItemField } from '../../../graphql/types';
import { InfraLoadingPanel } from '../../loading';
import { LogEntryActionsMenu } from './log_entry_actions_menu';

interface Props {
  flyoutItem: InfraLogItem | null;
  setFlyoutVisibility: (visible: boolean) => void;
  setFilter: (filter: string) => void;
  setTarget: (timeKey: TimeKey, flyoutItemId: string) => void;
  intl: InjectedIntl;
  loading: boolean;
}

export const LogEntryFlyout = injectI18n(
  ({ flyoutItem, loading, setFlyoutVisibility, setFilter, setTarget, intl }: Props) => {
    const createFilterHandler = useCallback(
      (field: InfraLogItemField) => () => {
        const filter = `${field.field}:"${field.value}"`;
        setFilter(filter);

        if (flyoutItem && flyoutItem.key) {
          const timestampMoment = moment(flyoutItem.key.time);
          if (timestampMoment.isValid()) {
            setTarget(
              {
                time: timestampMoment.valueOf(),
                tiebreaker: flyoutItem.key.tiebreaker,
              },
              flyoutItem.id
            );
          }
        }
      },
      [flyoutItem, setFilter, setTarget]
    );

    const closeFlyout = useCallback(() => setFlyoutVisibility(false), [setFlyoutVisibility]);

    const columns = useMemo(
      () => [
        {
          field: 'field',
          name: intl.formatMessage({
            defaultMessage: 'Field',
            id: 'xpack.infra.logFlyout.fieldColumnLabel',
          }),
          sortable: true,
        },
        {
          field: 'value',
          name: intl.formatMessage({
            defaultMessage: 'Value',
            id: 'xpack.infra.logFlyout.valueColumnLabel',
          }),
          sortable: true,
          render: (_name: string, item: InfraLogItemField) => (
            <span>
              <EuiToolTip
                content={intl.formatMessage({
                  id: 'xpack.infra.logFlyout.setFilterTooltip',
                  defaultMessage: 'View event with filter',
                })}
              >
                <EuiButtonIcon
                  color="text"
                  iconType="filter"
                  aria-label={intl.formatMessage({
                    id: 'xpack.infra.logFlyout.filterAriaLabel',
                    defaultMessage: 'Filter',
                  })}
                  onClick={createFilterHandler(item)}
                />
              </EuiToolTip>
              {item.value}
            </span>
          ),
        },
      ],
      [createFilterHandler, intl.formatMessage]
    );

    return (
      <EuiFlyout onClose={closeFlyout} size="m">
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3 id="flyoutTitle">
                  <FormattedMessage
                    defaultMessage="Log event document details"
                    id="xpack.infra.logFlyout.flyoutTitle"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {flyoutItem !== null ? <LogEntryActionsMenu logItem={flyoutItem} /> : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {loading || flyoutItem === null ? (
            <InfraFlyoutLoadingPanel>
              <InfraLoadingPanel
                height="100%"
                width="100%"
                text={intl.formatMessage({
                  id: 'xpack.infra.logFlyout.loadingMessage',
                  defaultMessage: 'Loading Event',
                })}
              />
            </InfraFlyoutLoadingPanel>
          ) : (
            <EuiBasicTable columns={columns} items={flyoutItem.fields} />
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
);

export const InfraFlyoutLoadingPanel = euiStyled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;
