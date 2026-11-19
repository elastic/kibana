/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSelector } from 'react-redux-v7';
import { useWorkflowYamlValidationContext } from './use_workflow_yaml_validation_context';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_kibana');
jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useAvailableConnectors: () => undefined,
}));
jest.mock(
  '../../../widgets/workflow_yaml_editor/lib/esql_validation/use_workflow_esql_callbacks',
  () => ({
    useWorkflowEsqlCallbacks: () => ({}),
  })
);
jest.mock('./property_handlers/use_get_property_handler', () => ({
  useGetPropertyHandler: () => () => undefined,
}));
jest.mock('react-redux-v7', () => ({
  useSelector: jest.fn(() => ({ status: 'loading', workflows: {}, totalWorkflows: 0 })),
}));

describe('useWorkflowYamlValidationContext', () => {
  it('gives variable validation the outputs of the loaded workflows', () => {
    jest.mocked(useSelector).mockReturnValue({
      status: 'loading',
      totalWorkflows: 1,
      workflows: {
        'alert-context': {
          id: 'alert-context',
          name: 'Alert context',
          outputs: [{ name: 'severity', type: 'string' }],
          returnedOutputNames: ['severity'],
        },
      },
    });
    jest.mocked(useKibana).mockReturnValue({
      services: {
        application: { getUrlForApp: jest.fn(() => 'https://example.test') },
        workflowsExtensions: {},
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useWorkflowYamlValidationContext());

    expect(result.current.registry.getCalledWorkflowOutputs?.('alert-context')).toEqual({
      name: 'Alert context',
      outputs: [{ name: 'severity', type: 'string' }],
      returnedOutputNames: ['severity'],
    });
    expect(result.current.registry.getCalledWorkflowOutputs?.('missing')).toBeUndefined();
  });
});
