/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiKeyPadMenuItem, EuiKeyPadMenu } from '@elastic/eui';
import { css } from '@emotion/react';

export interface Value<T> {
  label: string;
  id: T;
  icon: string;
  betaBadgeLabel?: string;
  betaBadgeTooltipContent?: string;
  betaBadgeIconType?: string;
}

interface Props<T> {
  title: string;
  values: Array<Value<T>>;
  selectedValue: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}

export function ValuesGroup<T extends string = string>({
  title,
  values,
  onChange,
  selectedValue,
  ariaLabel,
}: Props<T>) {
  return (
    <>
      <EuiKeyPadMenu
        aria-label={ariaLabel}
        data-test-subj="appearanceColorMode"
        checkable={{
          legend: <span>{title}</span>,
        }}
        css={css`
          inline-size: 420px; // Allow for 4 items to fit in a row instead of the default 3
        `}
      >
        {values.map(({ id, label, icon }) => (
          <EuiKeyPadMenuItem
            name={id}
            key={id}
            label={label}
            checkable="single"
            isSelected={selectedValue === id}
            onChange={() => {
              onChange(id);
            }}
            data-test-subj={`colorModeKeyPadItem${id}`}
          >
            <EuiIcon type={icon} size="l" />
          </EuiKeyPadMenuItem>
        ))}
      </EuiKeyPadMenu>
    </>
  );
}
