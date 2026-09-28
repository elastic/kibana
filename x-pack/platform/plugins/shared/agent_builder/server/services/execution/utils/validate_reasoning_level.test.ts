/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import { AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import { InferenceConnectorType, type InferenceConnector } from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { resolveSelectedConnectorId } from '../../../utils/resolve_selected_connector_id';
import { validateReasoningLevel } from './validate_reasoning_level';

jest.mock('../../../utils/resolve_selected_connector_id');

const resolveSelectedConnectorIdMock = resolveSelectedConnectorId as jest.MockedFn<
  typeof resolveSelectedConnectorId
>;

const createConnector = (parts: Partial<InferenceConnector> = {}): InferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: 'Claude Haiku',
  connectorId: '.anthropic-claude-haiku-chat_completion',
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: true,
  isEis: true,
  ...parts,
});

const createParams = () => {
  const inference = inferenceMock.createStartContract();
  const request = httpServerMock.createKibanaRequest();
  return {
    inference,
    request,
    params: {
      reasoningLevel: 'xhigh' as const,
      connectorId: 'requested-connector',
      request,
      inference,
      uiSettings: uiSettingsServiceMock.createStartContract(),
      savedObjects: savedObjectsServiceMock.createStartContract(),
      searchInferenceEndpoints: {} as SearchInferenceEndpointsPluginStart,
    },
  };
};

describe('validateReasoningLevel', () => {
  beforeEach(() => {
    resolveSelectedConnectorIdMock.mockResolvedValue('resolved-connector');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('validates the connector the execution resolves to', async () => {
    const { inference, request, params } = createParams();
    inference.getConnectorById.mockResolvedValue(createConnector({ isEis: false }));

    await validateReasoningLevel(params);

    expect(resolveSelectedConnectorIdMock).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'requested-connector', request })
    );
    expect(inference.getConnectorById).toHaveBeenCalledWith('resolved-connector', request);
  });

  it('skips validation when no connector resolves', async () => {
    const { inference, params } = createParams();
    resolveSelectedConnectorIdMock.mockResolvedValue(undefined);

    await expect(validateReasoningLevel(params)).resolves.toBeUndefined();
    expect(inference.getConnectorById).not.toHaveBeenCalled();
  });

  it('skips validation when connector resolution fails', async () => {
    const { inference, params } = createParams();
    resolveSelectedConnectorIdMock.mockRejectedValue(
      new Error('Connector ID [requested-connector] does not match the configured default')
    );

    await expect(validateReasoningLevel(params)).resolves.toBeUndefined();
    expect(inference.getConnectorById).not.toHaveBeenCalled();
  });

  it('skips validation when the resolved connector does not exist', async () => {
    const { inference, params } = createParams();
    inference.getConnectorById.mockRejectedValue(
      new Error("No connector or inference endpoint found for ID 'resolved-connector'")
    );

    await expect(validateReasoningLevel(params)).resolves.toBeUndefined();
  });

  it.each<{ description: string; connector: InferenceConnector }>([
    {
      description: 'any level for non-EIS connectors',
      connector: createConnector({ type: InferenceConnectorType.OpenAI, isEis: false }),
    },
    {
      description: 'any level for EIS endpoints that advertise no capabilities',
      connector: createConnector({ metadata: {} }),
    },
    {
      description: 'any level when the EIS endpoint advertises capabilities without reasoning',
      connector: createConnector({
        metadata: { capabilities: { context_window: { max_input_tokens: 1 } } },
      }),
    },
    {
      description: 'a level the EIS endpoint supports',
      connector: createConnector({
        metadata: { capabilities: { reasoning: { supported_effort_levels: ['xhigh', 'low'] } } },
      }),
    },
  ])('accepts $description', async ({ connector }) => {
    const { inference, params } = createParams();
    inference.getConnectorById.mockResolvedValue(connector);

    await expect(validateReasoningLevel(params)).resolves.toBeUndefined();
  });

  it('rejects a level the EIS endpoint does not support', async () => {
    const { inference, params } = createParams();
    inference.getConnectorById.mockResolvedValue(
      createConnector({
        metadata: { capabilities: { reasoning: { supported_effort_levels: ['high', 'low'] } } },
      })
    );

    await expect(validateReasoningLevel(params)).rejects.toMatchObject({
      code: AgentBuilderErrorCode.badRequest,
      message:
        'Reasoning level "xhigh" is not supported by model "Claude Haiku" (.anthropic-claude-haiku-chat_completion). Supported levels: high, low.',
      meta: { statusCode: 400 },
    });
  });
});
