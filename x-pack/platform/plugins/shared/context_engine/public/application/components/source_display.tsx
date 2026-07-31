/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React from 'react';
import type { SourceType } from './source_picker';

export interface SourceDisplay {
  iconType: string;
  typeLabel: string;
  label: string;
  /** Rendered instead of the plain-text label, when a source needs richer content. */
  content?: ReactNode;
}

export interface SourceDisplayDeps {
  connectorNameById: Map<string, string>;
}

type SourceDisplayFactory = (value: string, deps: SourceDisplayDeps) => SourceDisplay;

const SOURCE_DISPLAY: Record<SourceType, SourceDisplayFactory> = {
  esql: (value) => ({
    iconType: 'editorCodeBlock',
    typeLabel: i18n.translate('xpack.contextEngine.sourceType.esql', {
      defaultMessage: 'ES|QL',
    }),
    label: value,
    content: (
      <EuiCode language="sql" transparentBackground>
        {value}
      </EuiCode>
    ),
  }),
  connector: (value, { connectorNameById }) => ({
    iconType: 'plugs',
    typeLabel: i18n.translate('xpack.contextEngine.sourceType.connector', {
      defaultMessage: 'Connector',
    }),
    label: connectorNameById.get(value) ?? value,
  }),
};

export const getSourceDisplay = (
  type: SourceType,
  value: string,
  deps: SourceDisplayDeps
): SourceDisplay => SOURCE_DISPLAY[type](value, deps);
