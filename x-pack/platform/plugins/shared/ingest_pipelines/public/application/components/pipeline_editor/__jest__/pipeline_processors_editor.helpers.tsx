/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render } from '@testing-library/react';
import '@kbn/code-editor-mock/jest_helper';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { docLinksServiceMock } from '@kbn/core/public/mocks';
import type { Props } from '..';
import { ProcessorsEditorWithDeps } from './processors_editor';
import { documentationService, uiMetricService } from '../../../services';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null;
  const getDomInputValue = (evt: unknown): string =>
    isRecord(evt) && isRecord(evt.target) && typeof evt.target.value === 'string'
      ? evt.target.value
      : '';

  return {
    ...original,
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: {
      onChange: (options: Array<{ label: string; value?: string }>) => void;
      selectedOptions?: Array<{ label: string; value?: string }>;
      'data-test-subj'?: string;
    }) => {
      return (
        <input
          data-test-subj={props['data-test-subj'] ?? 'mockComboBox'}
          data-currentvalue={JSON.stringify(props.selectedOptions ?? [])}
          onChange={(evt: unknown) => {
            const value = getDomInputValue(evt);
            props.onChange([{ label: value, value }]);
          }}
        />
      );
    },
  };
});

type AutoSizerChildren = (size: { height: number; width: number }) => React.ReactNode;
jest.mock(
  'react-virtualized/dist/commonjs/AutoSizer',
  () =>
    ({ children }: { children: AutoSizerChildren }) =>
      <div>{children({ height: 500, width: 500 })}</div>
);

export const setupEnvironment = () => {
  // Initialize mock services
  uiMetricService.setup(usageCollectionPluginMock.createSetupContract());
  documentationService.setup(docLinksServiceMock.createStartContract());
};

export const setup = (props: Props) => {
  const renderResult = render(<ProcessorsEditorWithDeps {...props} />);

  return {
    rerenderWithProps: (nextProps: Props) =>
      renderResult.rerender(<ProcessorsEditorWithDeps {...nextProps} />),
  };
};
