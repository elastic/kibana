/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
} from '@elastic/eui';
import type { Theme } from '@emotion/react';
import { css } from '@emotion/react';
import { useField } from 'formik';
import type { FunctionComponent } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FormLabel } from './form_label';

export interface ContrastKeyPadMenuProps {
  name: string;
  isDisabled?: boolean;
}

interface ContrastKeyPadItem {
  id: string;
  label: string;
  icon: string;
}

const betaBadgeCSS = ({ euiTheme }: Theme) => css`
  padding: calc(${euiTheme.size.xxs} * 1.5);
  border: ${euiTheme.border.width.thin} solid ${euiTheme.border.color};
  border-radius: 50%;
`;

export const ContrastKeyPadMenu: FunctionComponent<ContrastKeyPadMenuProps> = ({
  name,
  isDisabled = false,
}) => {
  const [field, , helpers] = useField(name);

  const contrastItem = ({ id, label, icon }: ContrastKeyPadItem) => {
    return (
      <EuiKeyPadMenuItem
        name={id}
        label={label}
        data-test-subj={`contrastKeyPadItem${id}`}
        checkable="single"
        isSelected={field.value === id}
        isDisabled={isDisabled}
        onChange={() => helpers.setValue(id)}
      >
        <EuiIcon type={icon} size="l" />
      </EuiKeyPadMenuItem>
    );
  };

  return (
    <EuiKeyPadMenu
      aria-label={i18n.translate('xpack.security.formComponents.contrastKeyPadMenu.ariaLabel', {
        defaultMessage: 'Interface contrast',
      })}
      data-test-subj="contrastMenu"
      checkable={{
        legend: (
          <FormLabel for={name}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={true}>
                <FormattedMessage
                  id="xpack.security.formComponents.contrastKeyPadMenu.legend"
                  defaultMessage="Interface contrast"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div css={betaBadgeCSS}>
                  <EuiIconTip
                    aria-label={i18n.translate(
                      'xpack.security.formComponents.contrastKeyPadMenu.betaBadge',
                      { defaultMessage: 'beta' }
                    )}
                    content={i18n.translate(
                      'xpack.security.formComponents.contrastKeyPadMenu.betaBadge.tooltip',
                      { defaultMessage: 'The contrast setting is currently a beta feature.' }
                    )}
                    type="beta"
                    position="bottom"
                  />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </FormLabel>
        ),
      }}
    >
      {contrastItem({
        id: 'system',
        label: i18n.translate('xpack.security.formComponents.contrastKeyPadMenu.systemLabel', {
          defaultMessage: 'System',
        }),
        icon: 'desktop',
      })}
      {contrastItem({
        id: 'standard',
        label: i18n.translate('xpack.security.formComponents.contrastKeyPadMenu.standardLabel', {
          defaultMessage: 'Normal',
        }),
        icon: 'contrast',
      })}
      {contrastItem({
        id: 'high',
        label: i18n.translate('xpack.security.formComponents.contrastKeyPadMenu.highLabel', {
          defaultMessage: 'High',
        }),
        icon: 'contrastHigh',
      })}
    </EuiKeyPadMenu>
  );
};
