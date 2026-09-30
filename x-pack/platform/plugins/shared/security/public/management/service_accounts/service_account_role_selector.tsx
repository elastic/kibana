/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiIconTip,
  EuiInputPopover,
  EuiLink,
  EuiSelectable,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useRef, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Role } from '../../../common';
import { isRoleDeprecated, isRoleReserved } from '../../../common/model';

interface Props {
  id?: string;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  availableRoles: Role[];
  selectedRoleNames: string[];
  onChange: (roles: string[]) => void;
  createRoleUrl?: string;
  isInvalid: boolean;
  isDisabled: boolean;
  isLoading: boolean;
}

type RoleOption = EuiSelectableOption<{ data?: { description?: string } }>;

export const ServiceAccountRoleSelector = ({
  id,
  'aria-describedby': describedBy,
  'aria-labelledby': labelledBy,
  availableRoles,
  selectedRoleNames,
  onChange,
  createRoleUrl,
  isInvalid,
  isDisabled,
  isLoading,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectRolesLabel = i18n.translate(
    'xpack.security.management.serviceAccounts.create.selectRolesLabel',
    {
      defaultMessage: 'Select roles',
    }
  );
  const optionForRole = (role: Role): RoleOption => ({
    key: role.name,
    label: role.name,
    checked: selectedRoleNames.includes(role.name) ? 'on' : undefined,
    'data-test-subj': `roleOption-${role.name}`,
    data: { description: role.description },
    css: css({ height: 32, borderBottom: euiTheme.border.thin }),
    append: isRoleDeprecated(role) ? (
      <EuiBadge color="warning">
        <FormattedMessage
          id="xpack.security.management.serviceAccounts.create.deprecatedRoleBadge"
          defaultMessage="deprecated"
        />
      </EuiBadge>
    ) : isRoleReserved(role) ? (
      <EuiBadge color="primary">
        <FormattedMessage
          id="xpack.security.management.serviceAccounts.create.builtInRoleBadge"
          defaultMessage="built-in"
        />
      </EuiBadge>
    ) : undefined,
  });
  const customRoles = availableRoles.filter((role) => !isRoleReserved(role));
  const predefinedRoles = availableRoles.filter(isRoleReserved);
  const groupStyle = css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
    minHeight: 32,
    color: euiTheme.colors.textParagraph,
    paddingBlock: 0,
    '&:not(:first-child)': { paddingBlockStart: 0 },
    borderBottom: euiTheme.border.thin,
  });
  const missingRoles = selectedRoleNames.filter(
    (name) => !availableRoles.some((role) => role.name === name)
  );
  const options: RoleOption[] = [
    ...missingRoles.map(
      (name): RoleOption => ({
        key: name,
        label: name,
        checked: 'on',
        'data-test-subj': `roleOption-${name}`,
        append: (
          <EuiBadge color="warning">
            <FormattedMessage
              id="xpack.security.management.serviceAccounts.create.unavailableRoleBadge"
              defaultMessage="unavailable"
            />
          </EuiBadge>
        ),
      })
    ),
    ...customRoles.map(optionForRole),
    ...(predefinedRoles.length
      ? [
          {
            label: i18n.translate(
              'xpack.security.management.serviceAccounts.create.predefinedRolesLabel',
              {
                defaultMessage: 'Pre-defined roles',
              }
            ),
            isGroupLabel: true as const,
            css: groupStyle,
          },
          ...predefinedRoles.map(optionForRole),
        ]
      : []),
  ];

  return (
    <EuiInputPopover
      fullWidth
      isOpen={isOpen && !isDisabled}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      panelProps={{
        onKeyDown: (event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(false);
            buttonRef.current?.focus();
          }
        },
      }}
      input={
        <EuiButtonEmpty
          id={id}
          buttonRef={buttonRef}
          size="s"
          color="text"
          iconType="chevronSingleDown"
          iconSide="right"
          isDisabled={isDisabled}
          isLoading={isLoading}
          aria-label={labelledBy ? undefined : selectRolesLabel}
          aria-labelledby={labelledBy}
          aria-haspopup="listbox"
          aria-expanded={isOpen && !isDisabled}
          aria-describedby={describedBy}
          aria-invalid={isInvalid}
          data-test-subj="serviceAccountRolesSelector"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
          contentProps={{ css: css({ justifyContent: 'space-between', width: '100%' }) }}
          css={css({
            width: '100%',
            textAlign: 'left',
            fontWeight: euiTheme.font.weight.regular,
            border: euiTheme.border.thin,
            borderColor: isInvalid ? euiTheme.colors.danger : euiTheme.colors.mediumShade,
            borderRadius: euiTheme.border.radius.small,
            backgroundColor: euiTheme.colors.backgroundBasePlain,
          })}
        >
          {selectedRoleNames.length ? selectedRoleNames.join(', ') : selectRolesLabel}
        </EuiButtonEmpty>
      }
    >
      <div>
        <div
          css={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 32,
            paddingInline: euiTheme.size.s,
            borderBottom: euiTheme.border.thin,
          })}
        >
          <strong>
            <FormattedMessage
              id="xpack.security.management.serviceAccounts.create.customRolesLabel"
              defaultMessage="Custom roles"
            />
          </strong>
          {createRoleUrl && (
            <EuiLink
              href={createRoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              color="text"
              css={css({ textDecoration: 'underline' })}
            >
              <FormattedMessage
                id="xpack.security.management.serviceAccounts.create.createRoleLinkText"
                defaultMessage="Create new role"
              />
            </EuiLink>
          )}
        </div>
        <EuiSelectable
          aria-label={selectRolesLabel}
          options={options}
          height={Math.min(256, Math.max(32, options.length * 32))}
          onChange={(nextOptions) =>
            onChange(
              nextOptions.filter((option) => option.checked === 'on').map(({ label }) => label)
            )
          }
          listProps={{
            rowHeight: 32,
            showIcons: false,
            paddingSize: 'none',
            onFocusBadge: false,
            autoFocus: true,
          }}
          renderOption={(option) => (
            <span>
              {option.label}
              {option.data?.description && (
                <>
                  {' '}
                  <EuiIconTip type="info" content={option.data.description} />
                </>
              )}
            </span>
          )}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    </EuiInputPopover>
  );
};
