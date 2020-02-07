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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { TimeKey } from '../../../../common/time';
import { InfraLoadingPanel } from '../../loading';
import { LogEntryActionsMenu } from './log_entry_actions_menu';
import { LogEntriesItem, LogEntriesItemField } from '../../../../common/http_api';

interface Props {
  flyoutItem: LogEntriesItem | null;
  setFlyoutVisibility: (visible: boolean) => void;
  setFilter: (filter: string) => void;
  setTarget: (timeKey: TimeKey, flyoutItemId: string) => void;

  loading: boolean;
}

export const LogEntryFlyout = ({
  flyoutItem,
  loading,
  setFlyoutVisibility,
  setFilter,
  setTarget,
}: Props) => {
  const createFilterHandler = useCallback(
    (field: LogEntriesItemField) => () => {
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
        name: i18n.translate('xpack.infra.logFlyout.fieldColumnLabel', {
          defaultMessage: 'Field',
        }),
        sortable: true,
      },
      {
        field: 'value',
        name: i18n.translate('xpack.infra.logFlyout.valueColumnLabel', {
          defaultMessage: 'Value',
        }),
        sortable: true,
        render: (_name: string, item: LogEntriesItemField) => (
          <span>
            <EuiToolTip
              content={i18n.translate('xpack.infra.logFlyout.setFilterTooltip', {
                defaultMessage: 'View event with filter',
              })}
            >
              <EuiButtonIcon
                color="text"
                iconType="filter"
                aria-label={i18n.translate('xpack.infra.logFlyout.filterAriaLabel', {
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
    [createFilterHandler]
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
              text={i18n.translate('xpack.infra.logFlyout.loadingMessage', {
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
};

export const InfraFlyoutLoadingPanel = euiStyled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;
