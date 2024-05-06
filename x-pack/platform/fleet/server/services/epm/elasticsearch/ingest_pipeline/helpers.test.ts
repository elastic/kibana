/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import path from 'path';

import type { RegistryDataStream } from '../../../../types';

import {
  addCustomPipelineAndLocalRoutingRulesProcessor,
  getPipelineNameForInstallation,
  rewriteIngestPipeline,
} from './helpers';

test('a json-format pipeline with pipeline references is correctly rewritten', () => {
  const inputStandard = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_input_standard.json'),
    'utf-8'
  );
  const inputBeats = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_input_beats.json'),
    'utf-8'
  );
  const output = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_output.json')
  ).toString('utf-8');

  const substitutions = [
    {
      source: 'pipeline-json',
      target: 'new-pipeline-json',
      templateFunction: 'IngestPipeline',
    },
    {
      source: 'pipeline-plaintext',
      target: 'new-pipeline-plaintext',
      templateFunction: 'IngestPipeline',
    },
  ];
  expect(rewriteIngestPipeline(inputStandard, substitutions)).toBe(output);
  expect(rewriteIngestPipeline(inputBeats, substitutions)).toBe(output);
});

test('a yml-format pipeline with pipeline references is correctly rewritten', () => {
  const inputStandard = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_input_standard.yml')
  ).toString('utf-8');
  const inputBeats = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_input_beats.yml')
  ).toString('utf-8');
  const output = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_output.yml')
  ).toString('utf-8');

  const substitutions = [
    {
      source: 'pipeline-json',
      target: 'new-pipeline-json',
      templateFunction: 'IngestPipeline',
    },
    {
      source: 'pipeline-plaintext',
      target: 'new-pipeline-plaintext',
      templateFunction: 'IngestPipeline',
    },
  ];
  expect(rewriteIngestPipeline(inputStandard, substitutions)).toBe(output);
  expect(rewriteIngestPipeline(inputBeats, substitutions)).toBe(output);
});

test('a json-format pipeline with no pipeline references stays unchanged', () => {
  const input = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/no_replacement.json')
  ).toString('utf-8');

  const substitutions = [
    {
      source: 'pipeline-json',
      target: 'new-pipeline-json',
      templateFunction: 'IngestPipeline',
    },
    {
      source: 'pipeline-plaintext',
      target: 'new-pipeline-plaintext',
      templateFunction: 'IngestPipeline',
    },
  ];
  expect(rewriteIngestPipeline(input, substitutions)).toBe(input);
});

test('a yml-format pipeline with no pipeline references stays unchanged', () => {
  const input = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/no_replacement.yml')
  ).toString('utf-8');

  const substitutions = [
    {
      source: 'pipeline-json',
      target: 'new-pipeline-json',
      templateFunction: 'IngestPipeline',
    },
    {
      source: 'pipeline-plaintext',
      target: 'new-pipeline-plaintext',
      templateFunction: 'IngestPipeline',
    },
  ];
  expect(rewriteIngestPipeline(input, substitutions)).toBe(input);
});

test('getPipelineNameForInstallation gets correct name', () => {
  const dataStream: RegistryDataStream = {
    dataset: 'coredns.log',
    title: 'CoreDNS logs',
    release: 'ga',
    type: 'logs',
    ingest_pipeline: 'pipeline-entry',
    package: 'coredns',
    path: 'log',
  };
  const packageVersion = '1.0.1';
  const pipelineRefName = 'pipeline-json';
  const pipelineEntryNameForInstallation = getPipelineNameForInstallation({
    pipelineName: dataStream.ingest_pipeline!,
    dataStream,
    packageVersion,
  });
  const pipelineRefNameForInstallation = getPipelineNameForInstallation({
    pipelineName: pipelineRefName,
    dataStream,
    packageVersion,
  });
  expect(pipelineEntryNameForInstallation).toBe(
    `${dataStream.type}-${dataStream.dataset}-${packageVersion}`
  );
  expect(pipelineRefNameForInstallation).toBe(
    `${dataStream.type}-${dataStream.dataset}-${packageVersion}-${pipelineRefName}`
  );
});

describe('addCustomPipelineAndLocalRoutingRulesProcessor', () => {
  it('add custom pipeline processor at the end of the pipeline for yaml pipeline', () => {
    const pipelineInstall = addCustomPipelineAndLocalRoutingRulesProcessor({
      contentForInstallation: `
processors:
  - set:
      field: test
      value: toto
      `,
      extension: 'yml',
      nameForInstallation: 'logs-test-1.0.0',
      shouldInstallCustomPipelines: true,
    });

    expect(pipelineInstall.contentForInstallation).toMatchInlineSnapshot(`
      "
      processors:
        - set:
            field: test
            value: toto
            "
    `);
  });

  it('add custom pipeline processor at the end of the pipeline for json pipeline', () => {
    const pipelineInstall = addCustomPipelineAndLocalRoutingRulesProcessor({
      contentForInstallation: `{
        "processors": [
          {
            "set": {
              "field": "test",
              "value": "toto"
            }
          }
        ]
      }`,
      extension: 'json',
      nameForInstallation: 'logs-test-1.0.0',
      dataStream: {
        type: 'logs',
        dataset: 'test',
      } as any,
      shouldInstallCustomPipelines: true,
    });

    expect(pipelineInstall.contentForInstallation).toMatchInlineSnapshot(
      `"{\\"processors\\":[{\\"set\\":{\\"field\\":\\"test\\",\\"value\\":\\"toto\\"}},{\\"pipeline\\":{\\"name\\":\\"global@custom\\",\\"ignore_missing_pipeline\\":true,\\"description\\":\\"[Fleet] Global pipeline for all data streams\\"}},{\\"pipeline\\":{\\"name\\":\\"logs@custom\\",\\"ignore_missing_pipeline\\":true,\\"description\\":\\"[Fleet] Pipeline for all data streams of type \`logs\`\\"}},{\\"pipeline\\":{\\"name\\":\\"logs-test@custom\\",\\"ignore_missing_pipeline\\":true,\\"description\\":\\"[Fleet] Pipeline for the \`test\` dataset\\"}}]}"`
    );
  });

  describe('with local routing rules', () => {
    it('add reroute processor after custom pipeline processor for yaml pipeline', () => {
      const pipelineInstall = addCustomPipelineAndLocalRoutingRulesProcessor({
        contentForInstallation: `
processors:
  - set:
      field: test
      value: toto
      `,
        extension: 'yml',
        nameForInstallation: 'logs-test-1.0.0',
        shouldInstallCustomPipelines: true,
        dataStream: {
          type: 'logs',
          dataset: 'test.access',
          routing_rules: [
            {
              source_dataset: 'test.access',
              rules: [
                {
                  target_dataset: 'test.reroute',
                  if: 'true == true',
                  namespace: 'default',
                },
              ],
            },
          ],
        } as any,
      });

      expect(pipelineInstall.contentForInstallation).toMatchInlineSnapshot(`
        "---
        processors:
          - set:
              field: test
              value: toto
          - pipeline:
              name: global@custom
              ignore_missing_pipeline: true
              description: '[Fleet] Global pipeline for all data streams'
          - pipeline:
              name: logs@custom
              ignore_missing_pipeline: true
              description: '[Fleet] Pipeline for all data streams of type \`logs\`'
          - pipeline:
              name: logs-test.access@custom
              ignore_missing_pipeline: true
              description: '[Fleet] Pipeline for the \`test.access\` dataset'
          - reroute:
              tag: test.access
              dataset: test.reroute
              namespace: default
              if: true == true
        "
      `);
    });

    it('add reroute processor after custom pipeline processor for json pipeline', () => {
      const pipelineInstall = addCustomPipelineAndLocalRoutingRulesProcessor({
        contentForInstallation: `{
        "processors": [
          {
            "set": {
              "field": "test",
              "value": "toto"
            }
          }
        ]
      }`,
        extension: 'json',
        nameForInstallation: 'logs-test-1.0.0',
        shouldInstallCustomPipelines: true,
        dataStream: {
          type: 'logs',
          dataset: 'test.access',
          routing_rules: [
            {
              source_dataset: 'test.access',
              rules: [
                {
                  target_dataset: 'test.reroute',
                  if: 'true == true',
                  namespace: 'default',
                },
              ],
            },
          ],
        } as any,
      });

      expect(pipelineInstall.contentForInstallation).toMatchInlineSnapshot(
        `"{\\"processors\\":[{\\"set\\":{\\"field\\":\\"test\\",\\"value\\":\\"toto\\"}},{\\"pipeline\\":{\\"name\\":\\"global@custom\\",\\"ignore_missing_pipeline\\":true,\\"description\\":\\"[Fleet] Global pipeline for all data streams\\"}},{\\"pipeline\\":{\\"name\\":\\"logs@custom\\",\\"ignore_missing_pipeline\\":true,\\"description\\":\\"[Fleet] Pipeline for all data streams of type \`logs\`\\"}},{\\"pipeline\\":{\\"name\\":\\"logs-test.access@custom\\",\\"ignore_missing_pipeline\\":true,\\"description\\":\\"[Fleet] Pipeline for the \`test.access\` dataset\\"}},{\\"reroute\\":{\\"tag\\":\\"test.access\\",\\"dataset\\":\\"test.reroute\\",\\"namespace\\":\\"default\\",\\"if\\":\\"true == true\\"}}]}"`
      );
    });
  });
});
