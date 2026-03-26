/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiKeyPadMenu, EuiKeyPadMenuItem, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { useField } from 'formik';
import type { FunctionComponent } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FormLabel } from './form_label';

export interface ThemeKeyPadMenuProps {
  name: string;
  isDisabled?: boolean;
  isThemeOverridden?: boolean;
}

interface ThemeKeyPadItem {
  id: string;
  label: string;
  icon: string;
}

export const ThemeKeyPadMenu: FunctionComponent<ThemeKeyPadMenuProps> = ({
  name,
  isDisabled = false,
  isThemeOverridden = false,
}) => {
  const [field, , helpers] = useField(name);

  const themeItem = ({ id, label, icon }: ThemeKeyPadItem) => {
    return (
      <EuiKeyPadMenuItem
        name={id}
        label={label}
        data-test-subj={`themeKeyPadItem${id}`}
        checkable="single"
        isSelected={field.value === id}
        isDisabled={isDisabled}
        onChange={() => helpers.setValue(id)}
      >
        <EuiIcon type={icon} size="l" />
      </EuiKeyPadMenuItem>
    );
  };

  const themeKeyPadMenu = (
    <EuiKeyPadMenu
      aria-label={i18n.translate('xpack.security.formComponents.themeKeyPadMenu.ariaLabel', {
        defaultMessage: 'Elastic theme',
      })}
      data-test-subj="themeMenu"
      checkable={{
        legend: (
          <FormLabel for={name}>
            <FormattedMessage
              id="xpack.security.formComponents.themeKeyPadMenu.legend"
              defaultMessage="Color mode"
            />
          </FormLabel>
        ),
      }}
      css={css`
        inline-size: 420px; // Allow for 4 items to fit in a row instead of the default 3
      `}
    >
      {themeItem({
        id: 'system',
        label: i18n.translate('xpack.security.formComponents.themeKeyPadMenu.systemLabel', {
          defaultMessage: 'System',
        }),
        icon: 'desktop',
      })}
      {themeItem({
        id: 'light',
        label: i18n.translate('xpack.security.formComponents.themeKeyPadMenu.lightLabel', {
          defaultMessage: 'Light',
        }),
        icon: 'sun',
      })}
      {themeItem({
        id: 'dark',
        label: i18n.translate('xpack.security.formComponents.themeKeyPadMenu.darkLabel', {
          defaultMessage: 'Dark',
        }),
        icon: 'moon',
      })}
      {themeItem({
        id: 'space_default',
        label: i18n.translate('xpack.security.formComponents.themeKeyPadMenu.spaceDefaultLabel', {
          defaultMessage: 'Space default',
        }),
        icon: 'spaces',
      })}
    </EuiKeyPadMenu>
  );

  return isThemeOverridden ? (
    <EuiToolTip
      data-test-subj="themeOverrideTooltip"
      content={
        <FormattedMessage
          id="xpack.security.formComponents.themeKeyPadMenu.overriddenMessage"
          defaultMessage="This setting is overridden by the Kibana server and can not be changed."
        />
      }
    >
      {themeKeyPadMenu}
    </EuiToolTip>
  ) : (
    themeKeyPadMenu
  );
};
