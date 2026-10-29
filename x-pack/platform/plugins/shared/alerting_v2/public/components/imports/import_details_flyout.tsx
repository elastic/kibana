/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCopy,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FlyoutTemplate } from '@kbn/flyout-template';
import type { FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import { ALERTING_V2_EPISODES_STATUS_ALL } from '@kbn/alerting-v2-constants';
import type { ImportCredentialsResponse } from '@kbn/alerting-v2-schemas';
import { useAlertingLocators } from '../../application/locator_context';
import { useRotateImportToken } from '../../hooks/use_rotate_import_token';
import type { ImportListItem } from '../../pages/imports_page/imports_data_source';
import { ConnectorTypeIcon } from './connector_type_icon';
import { EditConnectorFlyout } from './edit_connector_flyout';
import { isManagedImport, useImportKindLabel } from './import_kind';
import { IMPORT_STATUS_META } from './import_status';
import { formatRelativeTime, getExecutionStatusColor } from './format_import_time';
import { getSeverityLabel } from './custom_import_setup_flyout';
import { ImportCredentialsPanel } from './import_credentials_panel';
import { RotateTokenModal } from './rotate_token_modal';
import { SendTestAlert } from './send_test_alert';

const EMPTY_VALUE = '-';
const HISTORY_KEY = Symbol('importDetailsFlyout');

const { Header, Body, Footer } = FlyoutTemplate;
const { Badge, InfoBlock } = Header;

interface ImportDetailsFlyoutProps {
  item: ImportListItem;
  canWrite: boolean;
  isStateLoading?: boolean;
  onClose: () => void;
  onToggleEnabled: (item: ImportListItem) => void;
  onRequestDelete: (item: ImportListItem) => void;
  /** Called after an action changed the import's stats, such as a test alert. */
  onRefresh?: () => void;
  session?: EuiFlyoutProps['session'];
  ownFocus?: EuiFlyoutProps['ownFocus'];
  size?: EuiFlyoutProps['size'];
}

const TagList = ({ tags }: { tags: string[] }) =>
  tags.length === 0 ? (
    <>{EMPTY_VALUE}</>
  ) : (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {tags.map((tag) => (
        <EuiFlexItem grow={false} key={tag}>
          <EuiBadge color="hollow">{tag}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );

const CopyableId = ({ value, ariaLabel }: { value: string; ariaLabel: string }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <code>{value}</code>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiCopy textToCopy={value}>
        {(copy) => (
          <EuiButtonEmpty
            size="xs"
            iconType="copy"
            onClick={copy}
            aria-label={ariaLabel}
            data-test-subj={`importsCopy-${value}`}
          />
        )}
      </EuiCopy>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const ImportDetailsFlyout = ({
  item,
  canWrite,
  isStateLoading = false,
  onClose,
  onToggleEnabled,
  onRequestDelete,
  onRefresh,
  session = 'start',
  ownFocus = false,
  size = 'm',
}: ImportDetailsFlyoutProps) => {
  const { import: config, stats } = item;
  const isManaged = isManagedImport(config);
  const kindLabel = useImportKindLabel(config);
  const settings = useService(CoreStart('settings'));
  const application = useService(CoreStart('application'));
  const { episodesLocators } = useAlertingLocators();
  const dateTimeFormat = settings.client.get<string>('dateFormat');
  const formatDate = (value: string) => moment(value).format(dateTimeFormat);

  const { mutate: rotateToken, isLoading: isRotating } = useRotateImportToken();
  const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
  const [isEditConnectorOpen, setIsEditConnectorOpen] = useState(false);
  const [rotated, setRotated] = useState<ImportCredentialsResponse | null>(null);

  const statusMeta = stats ? IMPORT_STATUS_META[stats.status] : undefined;
  const lastAlert = formatRelativeTime(stats?.last_alert_at);

  const viewAlerts = () =>
    episodesLocators.navigateSync({
      filters: { ruleId: config.id, status: ALERTING_V2_EPISODES_STATUS_ALL },
    });

  const takeActionPanels = useMemo<FlyoutFooterMenuPanel[]>(
    () => [
      {
        id: 0,
        items: [
          // A managed import is switched on and off at its connector, with Receive events.
          ...(isManaged
            ? []
            : [
                {
                  name: config.enabled
                    ? i18n.translate('xpack.alertingV2.imports.detailsFlyout.disable', {
                        defaultMessage: 'Disable import',
                      })
                    : i18n.translate('xpack.alertingV2.imports.detailsFlyout.enable', {
                        defaultMessage: 'Enable import',
                      }),
                  icon: config.enabled ? 'pause' : 'play',
                  onClick: () => onToggleEnabled(item),
                  'data-test-subj': 'importsDetailsToggleEnabled',
                },
              ]),
          {
            name: i18n.translate('xpack.alertingV2.imports.detailsFlyout.rotateToken', {
              defaultMessage: 'Rotate token',
            }),
            icon: 'refresh',
            onClick: () => setIsRotateModalOpen(true),
            'data-test-subj': 'importsDetailsRotateToken',
          },
          {
            name: i18n.translate('xpack.alertingV2.imports.detailsFlyout.delete', {
              defaultMessage: 'Delete import',
            }),
            icon: 'trash',
            onClick: () => onRequestDelete(item),
            'data-test-subj': 'importsDetailsDelete',
          },
        ],
      },
    ],
    [config.enabled, isManaged, item, onToggleEnabled, onRequestDelete]
  );

  const configurationItems: EuiDescriptionListProps['listItems'] = [
    {
      title: i18n.translate('xpack.alertingV2.imports.detailsFlyout.description', {
        defaultMessage: 'Description',
      }),
      description: config.description || EMPTY_VALUE,
    },
    {
      title: i18n.translate('xpack.alertingV2.imports.detailsFlyout.source', {
        defaultMessage: 'Source',
      }),
      description: <code>{config.source}</code>,
    },
    ...(isManaged
      ? []
      : [
          {
            title: i18n.translate('xpack.alertingV2.imports.detailsFlyout.severity', {
              defaultMessage: 'Default severity',
            }),
            description: getSeverityLabel(config.default_severity) ?? EMPTY_VALUE,
          },
          {
            title: i18n.translate('xpack.alertingV2.imports.detailsFlyout.fingerprintField', {
              defaultMessage: 'Fingerprint field',
            }),
            description: config.fingerprint_field ? (
              <code>{config.fingerprint_field}</code>
            ) : (
              i18n.translate('xpack.alertingV2.imports.detailsFlyout.noFingerprint', {
                defaultMessage: 'None, every payload creates a new alert',
              })
            ),
          },
        ]),
    {
      title: i18n.translate('xpack.alertingV2.imports.detailsFlyout.tags', {
        defaultMessage: 'Tags',
      }),
      description: <TagList tags={config.tags} />,
    },
    {
      title: i18n.translate('xpack.alertingV2.imports.detailsFlyout.routingTags', {
        defaultMessage: 'Routing tags',
      }),
      description: <TagList tags={config.routing_tags} />,
    },
    {
      title: i18n.translate('xpack.alertingV2.imports.detailsFlyout.owner', {
        defaultMessage: 'Owner',
      }),
      description: config.owner ?? EMPTY_VALUE,
    },
    ...(config.external_config_url
      ? [
          {
            title: i18n.translate('xpack.alertingV2.imports.detailsFlyout.externalConfigUrl', {
              defaultMessage: 'Source configuration',
            }),
            description: (
              <EuiLink href={config.external_config_url} target="_blank" external>
                {config.external_config_url}
              </EuiLink>
            ),
          },
        ]
      : []),
    {
      title: i18n.translate('xpack.alertingV2.imports.detailsFlyout.importId', {
        defaultMessage: 'Import ID',
      }),
      description: (
        <CopyableId
          value={config.id}
          ariaLabel={i18n.translate('xpack.alertingV2.imports.detailsFlyout.copyImportId', {
            defaultMessage: 'Copy import ID',
          })}
        />
      ),
    },
    {
      title: isManaged
        ? i18n.translate('xpack.alertingV2.imports.detailsFlyout.managedConnector', {
            defaultMessage: 'Connector',
          })
        : i18n.translate('xpack.alertingV2.imports.detailsFlyout.connector', {
            defaultMessage: 'Webhook connector',
          }),
      description: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <CopyableId
              value={config.connector_id}
              ariaLabel={i18n.translate('xpack.alertingV2.imports.detailsFlyout.copyConnectorId', {
                defaultMessage: 'Copy connector ID',
              })}
            />
          </EuiFlexItem>
          {isManaged && canWrite && (
            <EuiFlexItem grow={false}>
              <EuiLink
                onClick={() => setIsEditConnectorOpen(true)}
                data-test-subj="importsDetailsEditConnector"
              >
                {i18n.translate('xpack.alertingV2.imports.detailsFlyout.editConnector', {
                  defaultMessage: 'Edit connector',
                })}
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ),
    },
    {
      title: isManaged
        ? i18n.translate('xpack.alertingV2.imports.detailsFlyout.managedWorkflow', {
            defaultMessage: 'Shared workflow',
          })
        : i18n.translate('xpack.alertingV2.imports.detailsFlyout.workflow', {
            defaultMessage: 'Workflow',
          }),
      description: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <code>{config.workflow_id}</code>
          </EuiFlexItem>
          {isManaged && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="importsDetailsManagedWorkflowBadge">
                {i18n.translate('xpack.alertingV2.imports.detailsFlyout.managedBadge', {
                  defaultMessage: 'Managed, shared',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiLink
              onClick={() =>
                application.navigateToApp('workflows', { path: `/${config.workflow_id}` })
              }
              data-test-subj="importsDetailsOpenWorkflow"
            >
              {i18n.translate('xpack.alertingV2.imports.detailsFlyout.openWorkflow', {
                defaultMessage: 'Open workflow',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  return (
    <>
      <FlyoutTemplate
        type="overlay"
        size={size}
        resizable
        ownFocus={ownFocus}
        session={session}
        historyKey={HISTORY_KEY}
        onClose={onClose}
        closeButtonProps={{ 'data-test-subj': 'importsDetailsFlyoutCloseIcon' }}
        data-test-subj="importsDetailsFlyout"
      >
        <Header
          title={config.name}
          description={
            isManaged ? (
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <ConnectorTypeIcon
                    connectorTypeId={config.connector_type_id}
                    size="s"
                    data-test-subj="importsDetailsKindIcon"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <span data-test-subj="importsDetailsKind">{kindLabel}</span>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <span data-test-subj="importsDetailsKind">{kindLabel}</span>
            )
          }
        >
          {statusMeta && (
            <Badge
              color={statusMeta.color === 'subdued' ? 'default' : statusMeta.color}
              toolTipContent={statusMeta.description}
              data-test-subj="importsDetailsStatusBadge"
            >
              {statusMeta.label}
            </Badge>
          )}
          {isManaged ? (
            <InfoBlock
              title={i18n.translate('xpack.alertingV2.imports.detailsFlyout.header.receiving', {
                defaultMessage: 'Receive events',
              })}
              data-test-subj="importsDetailsReceivingBlock"
            >
              {stats ? (
                <EuiBadge color={stats.receiving_events ? 'success' : 'warning'}>
                  {stats.receiving_events
                    ? i18n.translate('xpack.alertingV2.imports.detailsFlyout.receivingOn', {
                        defaultMessage: 'On',
                      })
                    : i18n.translate('xpack.alertingV2.imports.detailsFlyout.receivingOff', {
                        defaultMessage: 'Off',
                      })}
                </EuiBadge>
              ) : (
                EMPTY_VALUE
              )}
            </InfoBlock>
          ) : (
            <InfoBlock
              title={i18n.translate('xpack.alertingV2.imports.detailsFlyout.header.enabled', {
                defaultMessage: 'Enabled',
              })}
              data-test-subj="importsDetailsEnabledBlock"
            >
              {isStateLoading ? (
                <EuiLoadingSpinner size="m" />
              ) : (
                <EuiSwitch
                  compressed
                  showLabel={false}
                  checked={config.enabled}
                  disabled={!canWrite}
                  label={
                    config.enabled
                      ? i18n.translate('xpack.alertingV2.imports.detailsFlyout.enabledLabel', {
                          defaultMessage: 'Enabled',
                        })
                      : i18n.translate('xpack.alertingV2.imports.detailsFlyout.disabledLabel', {
                          defaultMessage: 'Disabled',
                        })
                  }
                  onChange={() => onToggleEnabled(item)}
                  data-test-subj="importsDetailsEnabledSwitch"
                />
              )}
            </InfoBlock>
          )}
          <InfoBlock
            title={i18n.translate('xpack.alertingV2.imports.detailsFlyout.header.lastAlert', {
              defaultMessage: 'Last alert',
            })}
            data-test-subj="importsDetailsLastAlertBlock"
          >
            {lastAlert && stats?.last_alert_at ? (
              <EuiToolTip content={formatDate(stats.last_alert_at)}>
                <span tabIndex={0}>{lastAlert}</span>
              </EuiToolTip>
            ) : (
              EMPTY_VALUE
            )}
          </InfoBlock>
          <InfoBlock
            title={i18n.translate('xpack.alertingV2.imports.detailsFlyout.header.alerts', {
              defaultMessage: 'Alerts',
            })}
            data-test-subj="importsDetailsAlertsBlock"
          >
            {stats ? stats.alert_series_count : EMPTY_VALUE}
          </InfoBlock>
        </Header>

        <Body>
          {rotated && (
            <Body.Section
              id="newCredentials"
              title={i18n.translate('xpack.alertingV2.imports.detailsFlyout.newCredentials', {
                defaultMessage: 'New credentials',
              })}
              hasBorder
              data-test-subj="importsDetailsNewCredentials"
            >
              <ImportCredentialsPanel
                url={rotated.credentials.url}
                token={rotated.credentials.token}
                publicBaseUrlConfigured={rotated.public_base_url_configured}
                fingerprintField={config.fingerprint_field}
              />
            </Body.Section>
          )}
          <Body.Section
            id="activity"
            title={i18n.translate('xpack.alertingV2.imports.detailsFlyout.activity', {
              defaultMessage: 'Activity',
            })}
            hasBorder
            data-test-subj="importsDetailsActivity"
          >
            <Body.Section.Subsection
              title={
                isManaged
                  ? i18n.translate('xpack.alertingV2.imports.detailsFlyout.lastSharedRun', {
                      defaultMessage: 'Last run of the shared workflow',
                    })
                  : i18n.translate('xpack.alertingV2.imports.detailsFlyout.lastRun', {
                      defaultMessage: 'Last workflow run',
                    })
              }
              data-test-subj="importsDetailsLastRun"
            >
              {stats?.last_execution ? (
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      color={getExecutionStatusColor(stats.last_execution.status)}
                      data-test-subj="importsDetailsLastRunStatus"
                    >
                      {stats.last_execution.status}
                    </EuiBadge>
                  </EuiFlexItem>
                  {stats.last_execution.started_at && (
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color="subdued">
                        {formatRelativeTime(stats.last_execution.started_at)}
                      </EuiText>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              ) : (
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.alertingV2.imports.detailsFlyout.noRuns"
                    defaultMessage="The workflow has not run yet."
                  />
                </EuiText>
              )}
            </Body.Section.Subsection>
            <Body.Section.Subsection
              title={i18n.translate('xpack.alertingV2.imports.detailsFlyout.testTitle', {
                defaultMessage: 'Test the import',
              })}
              data-test-subj="importsDetailsTest"
            >
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.alertingV2.imports.detailsFlyout.testBody"
                  defaultMessage="Send a sample payload through the workflow to check the setup end to end."
                />
              </EuiText>
              <EuiSpacer size="s" />
              <SendTestAlert
                importId={config.id}
                disabled={!canWrite || (!isManaged && !config.enabled)}
                onSent={onRefresh}
              />
            </Body.Section.Subsection>
          </Body.Section>
          <Body.Section
            id="configuration"
            title={i18n.translate('xpack.alertingV2.imports.detailsFlyout.configuration', {
              defaultMessage: 'Configuration',
            })}
            data-test-subj="importsDetailsConfiguration"
          >
            <EuiDescriptionList type="column" compressed listItems={configurationItems} />
          </Body.Section>
        </Body>

        <Footer>
          <Footer.SecondaryAction
            label={i18n.translate('xpack.alertingV2.imports.detailsFlyout.viewAlerts', {
              defaultMessage: 'View alerts',
            })}
            iconType="external"
            onClick={viewAlerts}
            data-test-subj="importsDetailsViewAlerts"
          />
          {canWrite && (
            <Footer.PrimaryActionMenu
              label={i18n.translate('xpack.alertingV2.imports.detailsFlyout.takeAction', {
                defaultMessage: 'Take action',
              })}
              aria-label={i18n.translate('xpack.alertingV2.imports.detailsFlyout.menuAriaLabel', {
                defaultMessage: 'Import actions',
              })}
              panels={takeActionPanels}
              data-test-subj="importsDetailsTakeActionButton"
            />
          )}
        </Footer>
      </FlyoutTemplate>
      {isEditConnectorOpen && (
        <EditConnectorFlyout
          connectorId={config.connector_id}
          onClose={() => setIsEditConnectorOpen(false)}
          onUpdated={onRefresh}
        />
      )}
      {isRotateModalOpen && (
        <RotateTokenModal
          isLoading={isRotating}
          onCancel={() => setIsRotateModalOpen(false)}
          onConfirm={() =>
            rotateToken(config.id, {
              onSuccess: (response) => {
                setRotated(response);
                setIsRotateModalOpen(false);
              },
              onSettled: () => setIsRotateModalOpen(false),
            })
          }
        />
      )}
    </>
  );
};
