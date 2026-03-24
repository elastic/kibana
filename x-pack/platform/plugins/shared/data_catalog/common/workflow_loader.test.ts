/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs } from 'fs';
import { loadWorkflows } from './workflow_loader';
import type { WorkflowsConfig } from './data_source_spec';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

const mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe('loadWorkflows', () => {
  const TEST_DIR = '/path/to/workflows';
  const mockStackConnectorIds = { '.notion': 'connector-1' };
  const mockConfig = (overrides?: Partial<WorkflowsConfig>): WorkflowsConfig => ({
    directory: TEST_DIR,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('file discovery', () => {
    it('loads .yaml files', async () => {
      const yamlContent = 'name: test-workflow\nversion: 1';
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(yamlContent);

      const result = await loadWorkflows(mockConfig(), mockStackConnectorIds);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe(yamlContent);
      expect(mockReadFile).toHaveBeenCalledWith(`${TEST_DIR}/workflow.yaml`, 'utf-8');
    });

    it('loads .yml files', async () => {
      const yamlContent = 'name: test-workflow';
      mockReaddir.mockResolvedValue(['workflow.yml'] as any);
      mockReadFile.mockResolvedValue(yamlContent);

      const result = await loadWorkflows(mockConfig(), mockStackConnectorIds);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe(yamlContent);
    });

    it('loads multiple YAML files from directory', async () => {
      mockReaddir.mockResolvedValue(['first.yaml', 'second.yml', 'third.yaml'] as any);
      mockReadFile
        .mockResolvedValueOnce('name: first')
        .mockResolvedValueOnce('name: second')
        .mockResolvedValueOnce('name: third');

      const result = await loadWorkflows(mockConfig(), mockStackConnectorIds);

      expect(result).toHaveLength(3);
      expect(mockReadFile).toHaveBeenCalledTimes(3);
    });

    it('ignores non-YAML files', async () => {
      mockReaddir.mockResolvedValue([
        'workflow.yaml',
        'readme.md',
        'config.json',
        'script.ts',
        'another.yml',
      ] as any);
      mockReadFile.mockResolvedValue('name: test');

      const result = await loadWorkflows(mockConfig(), mockStackConnectorIds);

      expect(result).toHaveLength(2);
      expect(mockReadFile).toHaveBeenCalledTimes(2);
      expect(mockReadFile).toHaveBeenCalledWith(`${TEST_DIR}/workflow.yaml`, 'utf-8');
      expect(mockReadFile).toHaveBeenCalledWith(`${TEST_DIR}/another.yml`, 'utf-8');
    });
  });

  describe('template variable substitution', () => {
    it('replaces <%= variable %> with template inputs', async () => {
      const template = 'name: <%= workflowName %>\nenv: <%= environment %>';
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(template);

      const result = await loadWorkflows(
        mockConfig({
          templateInputs: {
            workflowName: 'my-workflow',
            environment: 'production',
          },
        }),
        mockStackConnectorIds
      );

      expect(result[0].content).toBe('name: my-workflow\nenv: production');
    });

    it('leaves content unchanged when templateInputs is undefined', async () => {
      const content = 'name: <%= unchanged %>';
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(content);

      const result = await loadWorkflows(
        mockConfig({ templateInputs: undefined }),
        mockStackConnectorIds
      );

      // Mustache leaves unreplaced variables empty when not found
      expect(result[0].content).toBe('name: ');
    });

    it('leaves content unchanged when templateInputs is empty object', async () => {
      const content = 'name: <%= unchanged %>';
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(content);

      const result = await loadWorkflows(mockConfig({ templateInputs: {} }), mockStackConnectorIds);

      expect(result[0].content).toBe('name: ');
    });

    it('does NOT replace GitHub Actions ${{ }} expressions', async () => {
      const template = `
name: Deploy
env:
  TOKEN: \${{ secrets.GITHUB_TOKEN }}
  CUSTOM: <%= customVar %>
`;
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(template);

      const result = await loadWorkflows(
        mockConfig({ templateInputs: { customVar: 'my-value' } }),
        mockStackConnectorIds
      );

      expect(result[0].content).toContain('${{ secrets.GITHUB_TOKEN }}');
      expect(result[0].content).toContain('CUSTOM: my-value');
    });

    it('handles mixed template syntaxes correctly', async () => {
      const template = `
ejs: <%= ejsVar %>
github: \${{ github.var }}
mustache_style: {{ mustacheVar }}
`;
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(template);

      const result = await loadWorkflows(
        mockConfig({ templateInputs: { ejsVar: 'ejs-replaced' } }),
        mockStackConnectorIds
      );

      expect(result[0].content).toContain('ejs: ejs-replaced');
      expect(result[0].content).toContain('${{ github.var }}');
      expect(result[0].content).toContain('{{ mustacheVar }}');
    });
  });

  describe('agent-builder-tool tag detection', () => {
    it('sets shouldGenerateABTool to true when tags include agent-builder-tool', async () => {
      const yamlContent = `
name: test-workflow
tags:
  - agent-builder-tool
  - other-tag
`;
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(yamlContent);

      const result = await loadWorkflows(mockConfig(), mockStackConnectorIds);

      expect(result[0].shouldGenerateABTool).toBe(true);
    });

    it('sets shouldGenerateABTool to false when tags do not include agent-builder-tool', async () => {
      const yamlContent = `
name: test-workflow
tags:
  - some-tag
  - another-tag
`;
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(yamlContent);

      const result = await loadWorkflows(mockConfig(), mockStackConnectorIds);

      expect(result[0].shouldGenerateABTool).toBe(false);
    });

    it('sets shouldGenerateABTool to false when no tags are present', async () => {
      const yamlContent = 'name: test-workflow\nversion: 1';
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(yamlContent);

      const result = await loadWorkflows(mockConfig(), mockStackConnectorIds);

      expect(result[0].shouldGenerateABTool).toBe(false);
    });

    it('sets shouldGenerateABTool to false when tags is empty array', async () => {
      const yamlContent = 'name: test-workflow\ntags: []';
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(yamlContent);

      const result = await loadWorkflows(mockConfig(), mockStackConnectorIds);

      expect(result[0].shouldGenerateABTool).toBe(false);
    });

    it('detects agent-builder-tool tag after template substitution', async () => {
      const template = `
name: <%= workflowName %>
tags:
  - agent-builder-tool
`;
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(template);

      const result = await loadWorkflows(
        mockConfig({ templateInputs: { workflowName: 'dynamic-workflow' } }),
        mockStackConnectorIds
      );

      expect(result[0].shouldGenerateABTool).toBe(true);
      expect(result[0].content).toContain('name: dynamic-workflow');
    });
  });

  describe('error handling', () => {
    it('throws descriptive error when directory does not exist', async () => {
      const enoentError = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockReaddir.mockRejectedValue(enoentError);

      await expect(
        loadWorkflows(
          {
            directory: '/nonexistent/path',
            templateInputs: {},
          },
          mockStackConnectorIds
        )
      ).rejects.toThrow('Workflows directory does not exist: /nonexistent/path');
    });

    it('throws error when no YAML files are found in directory', async () => {
      mockReaddir.mockResolvedValue(['readme.md', 'config.json'] as any);

      await expect(loadWorkflows(mockConfig(), mockStackConnectorIds)).rejects.toThrow(
        `No YAML workflow files found in directory: ${TEST_DIR}`
      );
    });

    it('throws error when directory is empty', async () => {
      mockReaddir.mockResolvedValue([] as any);

      await expect(loadWorkflows(mockConfig(), mockStackConnectorIds)).rejects.toThrow(
        `No YAML workflow files found in directory: ${TEST_DIR}`
      );
    });

    it('wraps filesystem errors with context', async () => {
      const permissionError = new Error('EACCES: permission denied');
      mockReaddir.mockRejectedValue(permissionError);

      await expect(loadWorkflows(mockConfig(), mockStackConnectorIds)).rejects.toThrow(
        `Failed to load workflows from ${TEST_DIR}: EACCES: permission denied`
      );
    });

    it('wraps file read errors with context', async () => {
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      const readError = new Error('EACCES: permission denied');
      mockReadFile.mockRejectedValue(readError);

      await expect(loadWorkflows(mockConfig(), mockStackConnectorIds)).rejects.toThrow(
        `Failed to load workflows from ${TEST_DIR}: EACCES: permission denied`
      );
    });

    it('preserves original error as cause', async () => {
      const originalError = new Error('Original error');
      mockReaddir.mockRejectedValue(originalError);

      try {
        await loadWorkflows(mockConfig(), mockStackConnectorIds);
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error).cause).toBe(originalError);
      }
    });

    it('rethrows non-Error objects as-is', async () => {
      mockReaddir.mockRejectedValue('string error');

      await expect(loadWorkflows(mockConfig(), mockStackConnectorIds)).rejects.toBe('string error');
    });

    it('throws error when YAML file contains invalid syntax', async () => {
      const invalidYaml = `
name: test
tags:
  - valid-tag
  invalid indentation here
    nested: wrong
`;
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(invalidYaml);

      const error = await loadWorkflows(mockConfig(), mockStackConnectorIds).catch((e) => e);
      expect(error.message).toMatch(/Failed to load workflows from \/path\/to\/workflows:/);
      expect(error.cause.message).toMatch(/All mapping items must start at the same column/);
    });
  });

  describe('workflow info structure', () => {
    it('returns WorkflowInfo objects with content and shouldGenerateABTool', async () => {
      const yamlContent = 'name: test\ntags:\n  - agent-builder-tool';
      mockReaddir.mockResolvedValue(['workflow.yaml'] as any);
      mockReadFile.mockResolvedValue(yamlContent);

      const result = await loadWorkflows(mockConfig(), mockStackConnectorIds);

      expect(result[0]).toEqual({
        content: yamlContent,
        shouldGenerateABTool: true,
      });
    });

    it('processes all files and returns results for each', async () => {
      mockReaddir.mockResolvedValue(['a.yaml', 'b.yml'] as any);
      mockReadFile
        .mockResolvedValueOnce('name: a\ntags:\n  - agent-builder-tool')
        .mockResolvedValueOnce('name: b');

      const result = await loadWorkflows(mockConfig(), mockStackConnectorIds);

      expect(result).toEqual([
        { content: 'name: a\ntags:\n  - agent-builder-tool', shouldGenerateABTool: true },
        { content: 'name: b', shouldGenerateABTool: false },
      ]);
    });
  });
});
