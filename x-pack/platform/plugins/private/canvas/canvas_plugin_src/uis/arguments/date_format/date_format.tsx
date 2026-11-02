/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { FormatSelect } from '../../../../public/components/format_select/format_select';
import type { ArgumentProps } from '../../../../types/arguments';

interface DateFormatOption {
  /** A MomentJS format string */
  value: string;
  /** The name to display for the format */
  text: string;
}

export interface Props extends ArgumentProps {
  /** An array of number formats options */
  dateFormats: DateFormatOption[];
  /** The handler to invoke when value changes */
  onValueChange: (value: string) => void;
  /** The value of the argument */
  argValue: string;
  /** The ID for the argument */
  argId: string;
}

export const DateFormatArgInput: FunctionComponent<Props> = ({
  dateFormats,
  onValueChange,
  argValue,
  argId,
}) => (
  <FormatSelect
    argId={argId}
    argValue={argValue}
    formatOptions={dateFormats}
    onValueChange={onValueChange}
    defaultCustomFormat="M/D/YY h:ma"
  />
);
