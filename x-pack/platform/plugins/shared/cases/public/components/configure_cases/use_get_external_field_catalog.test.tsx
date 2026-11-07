/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';

import { ConnectorTypes } from '../../../common/types/domain';
import { TestProviders } from '../../common/mock';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import * as jiraApi from '../connectors/jira/api';
import * as resilientApi from '../connectors/resilient/api';
import * as serviceNowApi from '../connectors/servicenow/api';
import {
  hasExternalFieldCatalog,
  useGetExternalFieldCatalog,
} from './use_get_external_field_catalog';

jest.mock('../../common/lib/kibana');

const useApplicationCapabilitiesMock = useApplicationCapabilities as jest.Mock;

describe('useGetExternalFieldCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useApplicationCapabilitiesMock.mockReturnValue({ actions: { crud: true, read: true } });
  });

  it('knows which connector types expose a catalog', () => {
    expect(hasExternalFieldCatalog(ConnectorTypes.jira)).toBe(true);
    expect(hasExternalFieldCatalog(ConnectorTypes.serviceNowSIR)).toBe(true);
    expect(hasExternalFieldCatalog(ConnectorTypes.resilient)).toBe(true);
    expect(hasExternalFieldCatalog(ConnectorTypes.swimlane)).toBe(false);
    expect(hasExternalFieldCatalog(ConnectorTypes.casesWebhook)).toBe(false);
  });

  it('normalizes the Jira fields into a key to label map', async () => {
    jest.spyOn(jiraApi, 'getFields').mockResolvedValue({
      status: 'ok',
      actionId: 'jira-1',
      data: {
        summary: { name: 'Summary', allowedValues: [], defaultValue: {} },
        customfield_1: { allowedValues: [], defaultValue: {} },
      },
    });

    const { result } = renderHook(
      () =>
        useGetExternalFieldCatalog({ connectorId: 'jira-1', connectorType: ConnectorTypes.jira }),
      { wrapper: TestProviders }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.get('summary')).toEqual({ key: 'summary', label: 'Summary' });
    expect(result.current.data?.get('customfield_1')).toEqual({
      key: 'customfield_1',
      label: 'customfield_1',
    });
  });

  it('normalizes the ServiceNow fields', async () => {
    jest.spyOn(serviceNowApi, 'getFields').mockResolvedValue({
      status: 'ok',
      actionId: 'sn-1',
      data: [
        {
          element: 'short_description',
          column_label: 'Short description',
          mandatory: 'false',
          max_length: '160',
        },
      ],
    });

    const { result } = renderHook(
      () =>
        useGetExternalFieldCatalog({
          connectorId: 'sn-1',
          connectorType: ConnectorTypes.serviceNowITSM,
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.get('short_description')?.label).toBe('Short description');
  });

  it('normalizes the Resilient fields', async () => {
    jest.spyOn(resilientApi, 'getFields').mockResolvedValue({
      status: 'ok',
      actionId: 'res-1',
      data: [
        {
          name: 'description',
          text: 'Description',
          input_type: 'textarea',
          read_only: false,
          required: null,
          internal: false,
          prefix: null,
          values: null,
        },
      ],
    });

    const { result } = renderHook(
      () =>
        useGetExternalFieldCatalog({
          connectorId: 'res-1',
          connectorType: ConnectorTypes.resilient,
        }),
      { wrapper: TestProviders }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.get('description')?.label).toBe('Description');
  });

  it('reports an error when the connector itself fails instead of an empty catalog', async () => {
    jest.spyOn(jiraApi, 'getFields').mockResolvedValue({
      status: 'error',
      actionId: 'jira-1',
      message: 'Unable to get fields',
      serviceMessage: '401 Unauthorized',
    });

    const { result } = renderHook(
      () =>
        useGetExternalFieldCatalog({ connectorId: 'jira-1', connectorType: ConnectorTypes.jira }),
      { wrapper: TestProviders }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('does not call the connector without the actions read privilege', async () => {
    useApplicationCapabilitiesMock.mockReturnValue({ actions: { crud: false, read: false } });
    const spy = jest.spyOn(jiraApi, 'getFields');

    const { result } = renderHook(
      () =>
        useGetExternalFieldCatalog({ connectorId: 'jira-1', connectorType: ConnectorTypes.jira }),
      { wrapper: TestProviders }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not call the connector for a type without a catalog', () => {
    const spy = jest.spyOn(jiraApi, 'getFields');

    const { result } = renderHook(
      () =>
        useGetExternalFieldCatalog({ connectorId: 'sw-1', connectorType: ConnectorTypes.swimlane }),
      { wrapper: TestProviders }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(spy).not.toHaveBeenCalled();
  });
});
