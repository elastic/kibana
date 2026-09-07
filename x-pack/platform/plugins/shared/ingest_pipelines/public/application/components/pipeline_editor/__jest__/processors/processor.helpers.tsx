/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { docLinksServiceMock } from '@kbn/core/public/mocks';
import type { HttpSetup } from '@kbn/core/public';
import '@kbn/code-editor-mock/jest_helper';

import { uiMetricService, apiService, documentationService } from '../../../../services';
import type { Props } from '../..';
import { initHttpRequests } from '../http_requests.helpers';
import { ProcessorsEditorWithDeps } from '../processors_editor';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const getDomInputValue = (evt: unknown): string =>
  isRecord(evt) && isRecord(evt.target) && typeof evt.target.value === 'string'
    ? evt.target.value
    : '';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mock `EuiComboBox` as a plain input.
    EuiComboBox: (props: {
      'data-test-subj'?: string;
      selectedOptions?: Array<{ label?: string }>;
      onChange: (options: Array<{ label: string; value?: string }>) => void;
    }) => (
      <input
        data-test-subj={props['data-test-subj']}
        value={props.selectedOptions?.[0]?.label ?? ''}
        onChange={(event: unknown) => {
          const value = getDomInputValue(event);
          props.onChange([{ label: value, value }]);
        }}
      />
    ),
  };
});

type AutoSizerChildren = (size: { height: number; width: number }) => React.ReactNode;
jest.mock(
  'react-virtualized/dist/commonjs/AutoSizer',
  () =>
    ({ children }: { children: AutoSizerChildren }) =>
      <div>{children({ height: 500, width: 500 })}</div>
);

export const renderProcessorEditor = (httpSetup: HttpSetup, props: Props) => {
  apiService.setup(httpSetup, uiMetricService);
  return render(<ProcessorsEditorWithDeps {...props} />);
};

export const setupEnvironment = () => {
  // Initialize mock services
  uiMetricService.setup(usageCollectionPluginMock.createSetupContract());
  documentationService.setup(docLinksServiceMock.createStartContract());

  return initHttpRequests();
};

export const getProcessorValue = (onUpdate: jest.Mock) => {
  const [onUpdateResult] = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
  const { processors } = onUpdateResult.getData();
  return processors;
};
