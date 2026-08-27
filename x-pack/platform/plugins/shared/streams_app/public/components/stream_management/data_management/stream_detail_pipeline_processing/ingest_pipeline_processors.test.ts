/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { getGeneratedProcessorStepId } from '@kbn/ingest-pipeline-json-editor';
import { processorsToUiDefinition, uiDefinitionToProcessors } from './ingest_pipeline_processors';

describe('ingest pipeline processor UI serialization', () => {
  it('loads native set processors as editable set steps', () => {
    const uiDefinition = processorsToUiDefinition([
      {
        set: {
          field: 'host.name',
          value: 'kibana',
        },
      },
    ]);

    expect(uiDefinition.steps).toHaveLength(1);
    expect(uiDefinition.steps[0]).toEqual(
      expect.objectContaining({
        action: 'set',
        field: 'host.name',
        value: 'kibana',
      })
    );
  });

  it('persists editable set steps as native set processors', async () => {
    const uiDefinition = processorsToUiDefinition([
      {
        set: {
          field: 'host.name',
          value: 'kibana',
        },
      },
    ]);

    expect(uiDefinitionToProcessors(uiDefinition)).toEqual([
      {
        set: expect.objectContaining({
          field: 'host.name',
          value: 'kibana',
        }),
      },
    ]);
  });

  it('loads native set processors with hidden native options as editable set steps', () => {
    const processorWithNativeCondition: IngestProcessorContainer = {
      set: {
        field: 'host.name',
        value: 'kibana',
        if: "ctx.service?.name == 'kibana'",
        on_failure: [
          {
            set: {
              field: 'error.message',
              value: 'failed',
            },
          },
        ],
      },
    };

    const { steps } = processorsToUiDefinition([processorWithNativeCondition]);

    expect(steps).toHaveLength(1);
    expect(steps[0]).toEqual(
      expect.objectContaining({
        action: 'set',
        field: 'host.name',
        if: "ctx.service?.name == 'kibana'",
        on_failure: processorWithNativeCondition.set?.on_failure,
      })
    );
  });

  it('preserves hidden native processor options when persisting editable steps', async () => {
    const uiDefinition = processorsToUiDefinition([
      {
        set: {
          field: 'host.name',
          value: 'kibana',
          if: "ctx.service?.name == 'kibana'",
        },
      },
    ]);

    expect(uiDefinitionToProcessors(uiDefinition)).toEqual([
      {
        set: expect.objectContaining({
          field: 'host.name',
          value: 'kibana',
          if: "ctx.service?.name == 'kibana'",
        }),
      },
    ]);
  });

  it('preserves native enrich processor fields when persisting editable steps', async () => {
    const uiDefinition = processorsToUiDefinition([
      {
        enrich: {
          field: 'source.ip',
          policy_name: 'geoip-policy',
          target_field: 'source.geo',
        },
      },
    ]);

    expect(uiDefinition.steps[0]).toEqual(
      expect.objectContaining({
        action: 'enrich',
        field: 'source.ip',
        policy_name: 'geoip-policy',
        target_field: 'source.geo',
      })
    );
    expect(uiDefinitionToProcessors(uiDefinition)).toEqual([
      {
        enrich: expect.objectContaining({
          field: 'source.ip',
          policy_name: 'geoip-policy',
          target_field: 'source.geo',
        }),
      },
    ]);
  });

  it('does not persist generated UI identifiers into native processors by default', () => {
    expect(
      uiDefinitionToProcessors({
        steps: [
          {
            action: 'set',
            customIdentifier: getGeneratedProcessorStepId(0),
            parentId: null,
            branch: 'if',
            field: 'host.name',
            value: 'kibana',
          },
        ],
      })
    ).toEqual([
      {
        set: {
          field: 'host.name',
          value: 'kibana',
        },
      },
    ]);
  });

  it('persists user-provided processor tags', () => {
    expect(
      uiDefinitionToProcessors({
        steps: [
          {
            action: 'set',
            customIdentifier: 'user-tag',
            tag: 'user-tag',
            parentId: null,
            field: 'host.name',
            value: 'kibana',
          },
        ],
      })
    ).toEqual([
      {
        set: {
          field: 'host.name',
          value: 'kibana',
          tag: 'user-tag',
        },
      },
    ]);
  });

  it('includes generated processor tags for simulation metrics when requested', () => {
    expect(
      uiDefinitionToProcessors(
        {
          steps: [
            {
              action: 'set',
              customIdentifier: getGeneratedProcessorStepId(0),
              parentId: null,
              field: 'host.name',
              value: 'kibana',
            },
          ],
        },
        { includeGeneratedTags: true }
      )
    ).toEqual([
      {
        set: {
          field: 'host.name',
          value: 'kibana',
          tag: getGeneratedProcessorStepId(0),
        },
      },
    ]);
  });

  it('treats previous generated tag formats as internal tags on load', () => {
    const { steps } = processorsToUiDefinition([
      {
        set: {
          field: 'host.name',
          value: 'kibana',
          tag: 'root.steps[0]',
        },
      },
    ]);

    expect(steps[0]).toEqual(
      expect.objectContaining({
        customIdentifier: getGeneratedProcessorStepId(0),
      })
    );
    expect(steps[0]).not.toEqual(expect.objectContaining({ tag: 'root.steps[0]' }));
  });
});
