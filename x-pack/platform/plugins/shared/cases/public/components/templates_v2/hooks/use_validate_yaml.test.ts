/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useValidateYaml } from './use_validate_yaml';

const createFile = (name: string, content: string, type: string = 'application/x-yaml'): File =>
  new File([content], name, { type });

describe('useValidateYaml', () => {
  it('returns empty results for an empty file list', async () => {
    const { result } = renderHook(() => useValidateYaml());

    const output = await result.current.validateFiles([]);

    expect(output.validFiles).toHaveLength(0);
    expect(output.errors).toHaveLength(0);
  });

  it('validates a valid YAML file', async () => {
    const { result } = renderHook(() => useValidateYaml());
    const file = createFile('template.yaml', 'name: test\n');

    const output = await result.current.validateFiles([file]);

    expect(output.validFiles).toHaveLength(1);
    expect(output.validFiles[0].file).toBe(file);
    expect(output.validFiles[0].documents).toEqual([{ name: 'test' }]);
    expect(output.errors).toHaveLength(0);
  });

  it('rejects files with invalid extensions', async () => {
    const { result } = renderHook(() => useValidateYaml());
    const file = createFile('template.txt', 'name: test', 'text/plain');

    const output = await result.current.validateFiles([file]);

    expect(output.validFiles).toHaveLength(0);
    expect(output.errors).toHaveLength(1);
    expect(output.errors[0].fileName).toBe('template.txt');
  });

  it('rejects empty files', async () => {
    const { result } = renderHook(() => useValidateYaml());
    const file = createFile('empty.yaml', '');

    const output = await result.current.validateFiles([file]);

    expect(output.validFiles).toHaveLength(0);
    expect(output.errors).toHaveLength(1);
    expect(output.errors[0].fileName).toBe('empty.yaml');
  });

  it('rejects files exceeding 1 MB', async () => {
    const { result } = renderHook(() => useValidateYaml());
    const largeContent = 'a'.repeat(1024 * 1024 + 1);
    const file = createFile('big.yaml', largeContent);

    const output = await result.current.validateFiles([file]);

    expect(output.validFiles).toHaveLength(0);
    expect(output.errors).toHaveLength(1);
    expect(output.errors[0].fileName).toBe('big.yaml');
  });

  it('rejects files with invalid characters in file name', async () => {
    const { result } = renderHook(() => useValidateYaml());
    const file = createFile('bad<name>.yaml', 'name: test');

    const output = await result.current.validateFiles([file]);

    expect(output.validFiles).toHaveLength(0);
    expect(output.errors).toHaveLength(1);
    expect(output.errors[0].fileName).toBe('bad<name>.yaml');
  });

  it('returns an error when more than 100 files are provided', async () => {
    const { result } = renderHook(() => useValidateYaml());
    const files = Array.from({ length: 101 }, (_, i) =>
      createFile(`file-${i}.yaml`, `name: t${i}`)
    );

    const output = await result.current.validateFiles(files);

    expect(output.validFiles).toHaveLength(0);
    expect(output.errors).toHaveLength(1);
  });

  it('reports YAML syntax errors', async () => {
    const { result } = renderHook(() => useValidateYaml());
    const file = createFile('bad.yaml', '{ invalid yaml: [');

    const output = await result.current.validateFiles([file]);

    expect(output.validFiles).toHaveLength(0);
    expect(output.errors).toHaveLength(1);
    expect(output.errors[0].fileName).toBe('bad.yaml');
  });

  it('handles multi-document YAML files', async () => {
    const { result } = renderHook(() => useValidateYaml());
    const content = 'name: first\n---\nname: second\n';
    const file = createFile('multi.yaml', content);

    const output = await result.current.validateFiles([file]);

    expect(output.validFiles).toHaveLength(1);
    expect(output.validFiles[0].documents).toHaveLength(2);
  });

  it('accepts .yml extension', async () => {
    const { result } = renderHook(() => useValidateYaml());
    const file = createFile('template.yml', 'name: test\n');

    const output = await result.current.validateFiles([file]);

    expect(output.validFiles).toHaveLength(1);
    expect(output.errors).toHaveLength(0);
  });

  it('accepts files with empty MIME type (browser fallback)', async () => {
    const { result } = renderHook(() => useValidateYaml());
    const file = createFile('template.yaml', 'name: test\n', '');

    const output = await result.current.validateFiles([file]);

    expect(output.validFiles).toHaveLength(1);
    expect(output.errors).toHaveLength(0);
  });

  it('separates valid and invalid files in mixed input', async () => {
    const { result } = renderHook(() => useValidateYaml());
    const validFile = createFile('good.yaml', 'name: test\n');
    const invalidFile = createFile('bad.txt', 'name: test', 'text/plain');

    const output = await result.current.validateFiles([validFile, invalidFile]);

    expect(output.validFiles).toHaveLength(1);
    expect(output.validFiles[0].file).toBe(validFile);
    expect(output.errors).toHaveLength(1);
    expect(output.errors[0].fileName).toBe('bad.txt');
  });
});
