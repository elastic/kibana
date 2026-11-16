/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import { createModelProviderMock, type ModelProviderMock } from '../../../../test_utils';
import { selectSubagentModelSource } from './select_subagent_model_source';

describe('selectSubagentModelSource', () => {
  let modelProvider: ModelProviderMock;

  beforeEach(() => {
    modelProvider = createModelProviderMock();
    modelProvider.selectModel.mockResolvedValue({
      connector: { connectorId: 'selected-connector' },
    } as ScopedModel);
  });

  it('returns undefined when the sub-agent declares its own feature', async () => {
    modelProvider.hasFastModel.mockResolvedValue(true);

    const source = await selectSubagentModelSource({
      modelProvider,
      parentModel: { featureId: 'parent_feature' },
      effortLevel: 'low',
      inferenceFeatureId: 'subagent_feature',
    });

    expect(source).toBeUndefined();
    expect(modelProvider.hasFastModel).not.toHaveBeenCalled();
    expect(modelProvider.selectModel).not.toHaveBeenCalled();
  });

  it('returns the fast connector for low effort when a fast model exists', async () => {
    modelProvider.hasFastModel.mockResolvedValue(true);

    const source = await selectSubagentModelSource({
      modelProvider,
      parentModel: { featureId: 'parent_feature' },
      effortLevel: 'low',
    });

    expect(source).toEqual({ connectorId: 'selected-connector' });
    expect(modelProvider.selectModel).toHaveBeenCalledWith({ effortLevel: 'low' });
  });

  it("returns the parent's feature source for medium effort", async () => {
    modelProvider.hasFastModel.mockResolvedValue(true);

    const source = await selectSubagentModelSource({
      modelProvider,
      parentModel: { featureId: 'parent_feature' },
      effortLevel: 'medium',
    });

    expect(source).toEqual({ featureId: 'parent_feature' });
    expect(modelProvider.hasFastModel).not.toHaveBeenCalled();
    expect(modelProvider.selectModel).not.toHaveBeenCalled();
  });

  it("returns the parent's feature source for low effort when no fast model exists", async () => {
    modelProvider.hasFastModel.mockResolvedValue(false);

    const source = await selectSubagentModelSource({
      modelProvider,
      parentModel: { featureId: 'parent_feature' },
      effortLevel: 'low',
    });

    expect(source).toEqual({ featureId: 'parent_feature' });
    expect(modelProvider.selectModel).not.toHaveBeenCalled();
  });

  it("returns the parent's connector source when the parent runs on a connector", async () => {
    modelProvider.hasFastModel.mockResolvedValue(false);

    const source = await selectSubagentModelSource({
      modelProvider,
      parentModel: { connectorId: 'parent-connector' },
      effortLevel: 'high',
    });

    expect(source).toEqual({ connectorId: 'parent-connector' });
    expect(modelProvider.selectModel).not.toHaveBeenCalled();
  });

  it("falls back to the selected model's connector when the parent has no source", async () => {
    modelProvider.hasFastModel.mockResolvedValue(false);

    const source = await selectSubagentModelSource({
      modelProvider,
      effortLevel: 'high',
    });

    expect(source).toEqual({ connectorId: 'selected-connector' });
    expect(modelProvider.selectModel).toHaveBeenCalledWith({ effortLevel: 'high' });
  });
});
