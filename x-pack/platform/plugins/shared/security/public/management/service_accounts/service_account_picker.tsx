/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';

import type { CoreStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';

import { CreateServiceAccountFlyout } from './create_service_account_flyout';
import { ServiceAccountPickerPanel } from './service_account_picker_panel';
import type { ServiceAccountDirectoryEntry } from '../../../common/service_accounts';
import { ServiceAccountsAPIClient } from '../../service_accounts';
import type {
  ServiceAccountPickerDirectory,
  ServiceAccountPickerProps,
} from '../../ui_api/service_account_picker';
import { RolesAPIClient } from '../roles/roles_api_client';

type Props = ServiceAccountPickerProps & {
  core: CoreStart;
  isServerless: boolean;
  roleManagementEnabled: boolean;
};

export const ServiceAccountPicker = ({
  core,
  isServerless,
  roleManagementEnabled,
  selectedId,
  onSelect,
  search = '',
  onClose,
  directory,
  onCreate,
  activeIndex,
  onActiveIndexChange,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const isMounted = useMountedState();
  const client = useMemo(() => new ServiceAccountsAPIClient(core.http), [core.http]);
  const rolesClient = useMemo(() => new RolesAPIClient(core.http), [core.http]);
  const enabled = core.security.serviceAccounts.isEnabled();
  const usesOwnDirectory = directory === undefined;
  const generation = useRef(0);
  const [accounts, setAccounts] = useState<ServiceAccountDirectoryEntry[]>([]);
  const [status, setStatus] = useState<ServiceAccountPickerDirectory['status']>('loading');
  const [nextPage, setNextPage] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [localActiveIndex, setLocalActiveIndex] = useState(0);
  const optionRefs = useRef<Array<HTMLElement | null>>([]);

  const load = useCallback(
    async (after?: string) => {
      const current = ++generation.current;
      setStatus('loading');
      try {
        const result = await client.list({ limit: 100, ...(after ? { after } : {}) });
        if (!isMounted() || current !== generation.current) return;
        setAccounts((previous) =>
          Array.from(
            new Map(
              [...(after ? previous : []), ...result.serviceAccounts].map((account) => [
                account.id,
                account,
              ])
            ).values()
          )
        );
        setNextPage(result.nextPage);
        setStatus('ready');
      } catch (error) {
        if (!isMounted() || current !== generation.current) return;
        setStatus(
          isHttpFetchError(error) && error.response?.status === 403 ? 'forbidden' : 'unavailable'
        );
      }
    },
    [client, isMounted]
  );

  const invalidate = useCallback(() => {
    generation.current += 1;
  }, []);

  useEffect(() => {
    if (enabled && usesOwnDirectory) void load();
    return invalidate;
  }, [enabled, usesOwnDirectory, load, invalidate]);

  const source: ServiceAccountPickerDirectory = directory ?? {
    accounts,
    status,
    hasMore: Boolean(nextPage),
    onRetry: () => void load(),
    onLoadMore: () => {
      if (nextPage) void load(nextPage);
    },
  };
  const query = search.toLocaleLowerCase();
  const choices = source.accounts.filter(
    (account) =>
      account.enabled &&
      account.assumable &&
      `${account.name} ${account.id} ${account.description ?? ''}`
        .toLocaleLowerCase()
        .includes(query)
  );
  const optionCount = choices.length + (source.hasMore ? 1 : 0);
  const active = Math.max(0, Math.min(activeIndex ?? localActiveIndex, optionCount - 1));
  const moveTo = (index: number) => {
    setLocalActiveIndex(index);
    onActiveIndexChange?.(index);
  };
  const canCreate = core.security.serviceAccounts.canCreate();
  const createRoleUrl =
    roleManagementEnabled && core.application.capabilities.roles?.save
      ? core.application.getUrlForApp('management', { path: '/security/roles/edit' })
      : undefined;
  const loadMoreLabel = i18n.translate('xpack.security.serviceAccountPicker.loadMore', {
    defaultMessage: 'Load more service accounts',
  });
  const selected = choices[active];
  useEffect(() => {
    optionRefs.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, source.status, selected?.id]);
  if (!enabled) return null;

  return (
    <>
      <div css={css({ display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: 320 })}>
        <ServiceAccountPickerPanel
          core={core}
          status={source.status}
          hasSuggestions={optionCount > 0}
          filtered={Boolean(query || source.filtered)}
          onRetry={source.onRetry}
          onCreate={onCreate ?? (() => setCreating(true))}
        >
          <div
            role="listbox"
            tabIndex={-1}
            aria-label={i18n.translate('xpack.security.serviceAccountPicker.ariaLabel', {
              defaultMessage: 'Service accounts',
            })}
            css={css({ minHeight: 0, overflowY: 'auto' })}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && onClose) {
                event.preventDefault();
                event.stopPropagation();
                onClose();
              }
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                const next =
                  (active + (event.key === 'ArrowDown' ? 1 : -1) + optionCount) % optionCount;
                moveTo(next);
                optionRefs.current[next]?.focus();
              }
            }}
          >
            {choices.map((account, index) => (
              <EuiButtonEmpty
                key={account.id}
                role="option"
                tabIndex={index === active ? 0 : -1}
                aria-selected={index === active}
                aria-current={account.id === selectedId ? 'true' : undefined}
                buttonRef={(element) => {
                  optionRefs.current[index] = element;
                }}
                color="text"
                size="s"
                flush="both"
                data-test-subj="serviceAccountSuggestion"
                onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault()}
                onFocus={() => moveTo(index)}
                onClick={() => onSelect(account)}
                contentProps={{ css: css({ width: '100%', minWidth: 0 }) }}
                textProps={false}
                css={css({
                  width: '100%',
                  padding: euiTheme.size.s,
                  height: 'auto',
                  textAlign: 'left',
                  whiteSpace: 'normal',
                  fontWeight: euiTheme.font.weight.regular,
                  backgroundColor:
                    index === active ? euiTheme.colors.backgroundBasePrimary : undefined,
                })}
              >
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  responsive={false}
                  css={css({ width: '100%' })}
                >
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={account.id === selectedId ? 'check' : 'user'}
                      aria-hidden={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem css={css({ minWidth: 0, overflowWrap: 'anywhere' })}>
                    <span>{account.name}</span>
                    {account.description && (
                      <EuiText size="xs" color="subdued" component="span">
                        {account.description}
                      </EuiText>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
                      {account.roles.length === 0 && (
                        <EuiText size="xs" color="subdued" component="span">
                          {i18n.translate('xpack.security.serviceAccountPicker.noRoles', {
                            defaultMessage: 'No roles assigned',
                          })}
                        </EuiText>
                      )}
                      {account.roles.map((role) => (
                        <EuiFlexItem key={role} grow={false}>
                          <EuiBadge color="hollow" iconType="user">
                            {role}
                          </EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiButtonEmpty>
            ))}
            {source.hasMore && (
              <EuiButtonEmpty
                role="option"
                aria-selected={active === choices.length}
                tabIndex={active === choices.length ? 0 : -1}
                onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault()}
                buttonRef={(element) => {
                  optionRefs.current[choices.length] = element;
                }}
                data-test-subj="serviceAccountSuggestion"
                onFocus={() => moveTo(choices.length)}
                onClick={source.onLoadMore}
                css={css({ width: '100%', padding: euiTheme.size.s })}
              >
                {loadMoreLabel}
              </EuiButtonEmpty>
            )}
          </div>
          <EuiScreenReaderOnly>
            <div role="status" aria-live="polite">
              {selected?.name ?? (source.hasMore ? loadMoreLabel : '')} {selected?.roles.join(', ')}
            </div>
          </EuiScreenReaderOnly>
        </ServiceAccountPickerPanel>
      </div>
      {creating && canCreate && (
        <CreateServiceAccountFlyout
          isServerless={isServerless}
          serviceAccountsAPIClient={core.security.serviceAccounts}
          rolesAPIClient={rolesClient}
          createRoleUrl={createRoleUrl}
          onClose={() => setCreating(false)}
          onCreated={(account) => {
            setCreating(false);
            if (directory) directory.onRetry();
            else void load();
            core.notifications.toasts.addSuccess(
              i18n.translate('xpack.security.management.serviceAccounts.create.successTitle', {
                defaultMessage: 'Created service account "{name}"',
                values: { name: account.name },
              })
            );
            onSelect({ ...account, enabled: true, assumable: true });
          }}
        />
      )}
    </>
  );
};
