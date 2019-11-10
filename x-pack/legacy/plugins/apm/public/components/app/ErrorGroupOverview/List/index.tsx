/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiIcon
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { useKibanaCore } from '../../../../../../observability/public';
import {
  ErrorStatus,
  ACTIVE_ERRORS,
  ARCHIVED_ERRORS
} from '../../../../../common/errors';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { ErrorGroupListAPIResponse } from '../../../../../server/lib/errors/get_error_groups';
import {
  fontFamilyCode,
  fontSizes,
  px,
  truncate,
  unit
} from '../../../../style/variables';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { ManagedTable } from '../../../shared/ManagedTable';
import { ErrorDetailLink } from '../../../shared/Links/apm/ErrorDetailLink';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';
import { useCallApmApi } from '../../../../hooks/useCallApmApi';

const GroupIdLink = styled(ErrorDetailLink)`
  font-family: ${fontFamilyCode};
`;

const MessageAndCulpritCell = styled.div`
  ${truncate('100%')};
`;

const MessageLink = styled(ErrorDetailLink)`
  font-family: ${fontFamilyCode};
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

const Culprit = styled.div`
  font-family: ${fontFamilyCode};
`;

const ErrorStatusBadge = styled(EuiBadge)`
  text-transform: uppercase;
`;

interface Props {
  items: ErrorGroupListAPIResponse;
  onUiStateChange: () => Promise<void>;
}

interface Mutation {
  type: 'mute' | 'unmute' | 'resolve';
  groupId: string;
}

type ErrorGroup = ErrorGroupListAPIResponse[0];

const ErrorGroupList = (props: Props) => {
  const { items } = props;
  const {
    urlParams: { serviceName, errorStatus = ACTIVE_ERRORS }
  } = useUrlParams();

  const [mutations, setMutations] = useState<Mutation[]>([]);

  const { notifications } = useKibanaCore();

  const addMutation = useCallback(
    (mutation: Mutation, cb: () => Promise<string>) => {
      setMutations(_ => _.concat(mutation));
      cb()
        .then(
          title => {
            notifications.toasts.addSuccess(title);
          },
          error => {
            notifications.toasts.addError(error, { title: error.message });
          }
        )
        .then(() => {
          return props.onUiStateChange().then(() => {
            setMutations(_ => _.filter(m => mutation !== m));
          });
        });
    },
    [notifications.toasts, props]
  );

  const displayedItems = useMemo(() => {
    return mutations.reduce((prev, mutation) => {
      switch (mutation.type) {
        case 'mute':
          return errorStatus === ACTIVE_ERRORS
            ? prev.filter(group => group.groupId !== mutation.groupId)
            : prev;

        case 'unmute':
          return errorStatus === ARCHIVED_ERRORS
            ? prev.filter(group => group.groupId !== mutation.groupId)
            : prev;

        case 'resolve':
          return errorStatus === ACTIVE_ERRORS
            ? prev.filter(group => group.groupId !== mutation.groupId)
            : prev;
      }
      return prev;
    }, items);
  }, [errorStatus, items, mutations]);

  if (!serviceName) {
    throw new Error('Service name is required');
  }

  const callApmApi = useCallApmApi();

  const muteErrorGroup = useCallback(
    (errorGroup: ErrorGroup) => {
      addMutation(
        {
          type: 'mute',
          groupId: errorGroup.groupId
        },
        () => {
          return callApmApi({
            method: 'POST',
            pathname: `/api/apm/services/{serviceName}/errors/{groupId}/mute`,
            params: {
              path: {
                serviceName,
                groupId: errorGroup.groupId
              }
            }
          }).then(() =>
            i18n.translate('xpack.apm.errorsTable.errorMuteSuccess', {
              defaultMessage: 'Error successfully muted'
            })
          );
        }
      );
    },
    [addMutation, callApmApi, serviceName]
  );

  const unmuteErrorGroup = useCallback(
    (errorGroup: ErrorGroup) => {
      addMutation(
        {
          type: 'unmute',
          groupId: errorGroup.groupId
        },
        () => {
          return callApmApi({
            method: 'POST',
            pathname: `/api/apm/services/{serviceName}/errors/{groupId}/unmute`,
            params: {
              path: {
                serviceName,
                groupId: errorGroup.groupId
              }
            }
          }).then(() =>
            i18n.translate('xpack.apm.errorsTable.errorUnmuteSuccess', {
              defaultMessage: 'Error successfully unmuted'
            })
          );
        }
      );
    },
    [addMutation, callApmApi, serviceName]
  );

  const resolveErrorGroup = useCallback(
    (errorGroup: ErrorGroup) => {
      addMutation(
        {
          type: 'resolve',
          groupId: errorGroup.groupId
        },
        () => {
          return callApmApi({
            method: 'POST',
            pathname: `/api/apm/services/{serviceName}/errors/{groupId}/resolve`,
            params: {
              path: {
                serviceName,
                groupId: errorGroup.groupId
              }
            }
          }).then(() =>
            i18n.translate('xpack.apm.errorsTable.errorResolveSuccess', {
              defaultMessage: 'Error successfully resolved'
            })
          );
        }
      );
    },
    [addMutation, callApmApi, serviceName]
  );

  const columns = useMemo(
    () => [
      {
        name: i18n.translate('xpack.apm.errorsTable.groupIdColumnLabel', {
          defaultMessage: 'Group ID'
        }),
        field: 'groupId',
        sortable: false,
        width: px(unit * 6),
        render: (groupId: string) => {
          return (
            <GroupIdLink serviceName={serviceName} errorGroupId={groupId}>
              {groupId.slice(0, 5) || NOT_AVAILABLE_LABEL}
            </GroupIdLink>
          );
        }
      },
      {
        name: '',
        field: 'status',
        sortable: false,
        width: px(unit * 6),
        render: (status: ErrorStatus) => {
          switch (status) {
            case ErrorStatus.ACTIVE:
              return (
                <ErrorStatusBadge color={theme.euiColorSuccess}>
                  {i18n.translate('xpack.apm.errorsTable.errorStatusActive', {
                    defaultMessage: 'Active'
                  })}
                </ErrorStatusBadge>
              );

            case ErrorStatus.MUTED:
              return (
                <ErrorStatusBadge color={theme.euiColorLightestShade}>
                  {i18n.translate('xpack.apm.errorsTable.errorStatusMuted', {
                    defaultMessage: 'Muted'
                  })}
                </ErrorStatusBadge>
              );

            case ErrorStatus.RESOLVED:
              return (
                <ErrorStatusBadge color={theme.euiColorLightShade}>
                  {i18n.translate('xpack.apm.errorsTable.errorStatusResolved', {
                    defaultMessage: 'Resolved'
                  })}
                </ErrorStatusBadge>
              );

            case ErrorStatus.REOCCURED:
              return (
                <ErrorStatusBadge color={theme.euiColorWarning}>
                  {i18n.translate(
                    'xpack.apm.errorsTable.errorStatusReoccured',
                    {
                      defaultMessage: 'Reoccured'
                    }
                  )}
                </ErrorStatusBadge>
              );
          }
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
                <MessageLink
                  serviceName={serviceName}
                  errorGroupId={item.groupId}
                >
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
        name: '',
        field: '',
        sortable: false,
        align: 'right',
        width: px(unit * 6),
        render: (errorGroup: ErrorGroup) => {
          const { status } = errorGroup;
          const isMuted = status === ErrorStatus.MUTED;
          const isResolved = status === ErrorStatus.RESOLVED;

          const hasPendingChanges =
            mutations.filter(
              mutation => mutation.groupId === errorGroup.groupId
            ).length > 0;

          return (
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    isMuted
                      ? i18n.translate(
                          'xpack.apm.errorsTable.errorStatusButtonUnmute',
                          {
                            defaultMessage: 'Unmute'
                          }
                        )
                      : i18n.translate(
                          'xpack.apm.errorsTable.errorStatusButtonMute',
                          {
                            defaultMessage: 'Mute'
                          }
                        )
                  }
                >
                  <EuiButtonEmpty
                    size="s"
                    style={{ minWidth: 'auto' }}
                    disabled={hasPendingChanges}
                    onClick={() => {
                      if (isMuted) {
                        unmuteErrorGroup(errorGroup);
                      } else {
                        muteErrorGroup(errorGroup);
                      }
                    }}
                  >
                    {isMuted ? `🔇` : <EuiIcon type="bell" size="s" />}
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    isResolved
                      ? i18n.translate(
                          'xpack.apm.errorsTable.errorStatusButtonResolved',
                          {
                            defaultMessage: 'Resolved'
                          }
                        )
                      : i18n.translate(
                          'xpack.apm.errorsTable.errorStatusButtonResolve',
                          {
                            defaultMessage: 'Resolve'
                          }
                        )
                  }
                >
                  <EuiButtonEmpty
                    disabled={isResolved || hasPendingChanges}
                    size="s"
                    style={{ minWidth: 'auto' }}
                    onClick={() => resolveErrorGroup(errorGroup)}
                  >
                    <EuiIcon type="check" size="s" />
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }
      },
      {
        name: i18n.translate('xpack.apm.errorsTable.occurrencesColumnLabel', {
          defaultMessage: 'Occurrences'
        }),
        field: 'occurrenceCount',
        sortable: true,
        dataType: 'number',
        width: px(unit * 6),
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
          value ? (
            <TimestampTooltip time={value} precision="minutes" />
          ) : (
            NOT_AVAILABLE_LABEL
          )
      }
    ],
    [
      mutations,
      muteErrorGroup,
      resolveErrorGroup,
      serviceName,
      unmuteErrorGroup
    ]
  );

  return (
    <ManagedTable
      noItemsMessage={i18n.translate('xpack.apm.errorsTable.noErrorsLabel', {
        defaultMessage: 'No errors were found'
      })}
      items={displayedItems}
      columns={columns}
      initialPageSize={25}
      initialSortField="latestOccurrenceAt"
      initialSortDirection="desc"
      sortItems={false}
    />
  );
};

export { ErrorGroupList };
