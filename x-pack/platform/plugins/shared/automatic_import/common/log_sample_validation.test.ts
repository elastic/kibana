/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LOG_SAMPLE_SIGNATURE_BYTES,
  validateLogSampleContent,
  validateLogSampleFileName,
  validateLogSampleFileSignature,
} from './log_sample_validation';
import { normalizeLogSamplesFromFileContent } from './upload_samples_limits';

const asciiBytes = (value: string): Uint8Array => new TextEncoder().encode(value);

describe('validateLogSampleFileName', () => {
  it.each(['script.py', 'photo.JPG', 'config.yaml', 'report.xlsx', 'tool.exe', 'run.sh'])(
    'blocks %s',
    (fileName) => {
      expect(validateLogSampleFileName(fileName)).toEqual(
        expect.objectContaining({ valid: false, code: 'blocked_extension' })
      );
    }
  );

  it.each(['syslog.2.gz', 'logs.zip', 'archive.tar', 'logs.7z'])(
    'reports %s as a compressed file',
    (fileName) => {
      expect(validateLogSampleFileName(fileName)).toEqual(
        expect.objectContaining({ valid: false, code: 'compressed_file' })
      );
    }
  );

  it('includes the lowercased extension in the result', () => {
    expect(validateLogSampleFileName('Photo.JPEG')).toEqual({
      valid: false,
      code: 'blocked_extension',
      extension: 'jpeg',
    });
  });

  it.each([
    'app.log',
    'app.log.1',
    'messages',
    'events.json',
    'events.ndjson',
    'events.csv',
    'events.xml',
    'agent.conf',
    'output.txt',
    '.hidden',
    'trailing.',
  ])('allows %s', (fileName) => {
    expect(validateLogSampleFileName(fileName)).toEqual({ valid: true });
  });
});

describe('validateLogSampleFileSignature', () => {
  it.each([
    ['JPEG', [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]],
    ['PNG', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ['ZIP', [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]],
    ['GZIP', [0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]],
    ['ELF', [0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]],
  ])('blocks a %s signature', (_name, bytes) => {
    expect(validateLogSampleFileSignature(new Uint8Array(bytes))).toEqual({
      valid: false,
      code: 'binary_file',
    });
  });

  it.each([
    '<134>Nov  9 14:06:01 host app: started',
    '{"message":"hello"}',
    'MZ-SRV01 2026-11-09T14:06:01Z login succeeded',
    '',
  ])('allows text starting with %j', (text) => {
    expect(validateLogSampleFileSignature(asciiBytes(text))).toEqual({ valid: true });
  });

  it('needs no more than LOG_SAMPLE_SIGNATURE_BYTES bytes', () => {
    expect(LOG_SAMPLE_SIGNATURE_BYTES).toBe(8);
  });
});

describe('validateLogSampleContent', () => {
  it('rejects empty input', () => {
    expect(validateLogSampleContent([])).toEqual({ valid: false, code: 'empty' });
    expect(validateLogSampleContent(['', '   '])).toEqual({ valid: false, code: 'empty' });
  });

  it('rejects NUL-heavy text', () => {
    const binaryLike = `abc\u0000\u0000\u0000def\u0000\u0000ghi`;
    expect(validateLogSampleContent([binaryLike])).toEqual({
      valid: false,
      code: 'binary_content',
    });
  });

  it('rejects a script whose first line is a shebang', () => {
    const { samples } = normalizeLogSamplesFromFileContent(
      '\n\n#!/usr/bin/env python\nimport os\nprint(os.getcwd())\n'
    );
    expect(validateLogSampleContent(samples)).toEqual({ valid: false, code: 'script_content' });
  });

  it.each([
    ['Python docstring', '"""Validation for Dynaconf settings."""'],
    ['Python import', 'import os'],
    ['Python aliased import', 'import numpy as np'],
    ['Python from-import', 'from dynaconf.validator import Validator, ValidatorList'],
    ['Python function', 'def register_validations(validator) -> None:'],
    ['Python class', 'class Settings(BaseModel):'],
    ['Java import', 'import java.util.List;'],
    ['Java package', 'package com.example.app;'],
    ['Go package', 'package main'],
    ['C# using', 'using System.Text;'],
    ['C include', '#include <stdio.h>'],
    ['PHP', '<?php'],
    ['JavaScript strict mode', "'use strict';"],
    ['JavaScript import', "import { readFile } from 'fs';"],
    ['JavaScript default import', "import React from 'react';"],
    ['CommonJS export', 'module.exports = {'],
    ['JavaScript function', 'function main() {'],
    ['JavaScript const', 'export const config = {'],
    ['TypeScript type import', "import type { Logger } from '@kbn/core/server';"],
    ['TypeScript re-export', "export { useKibana } from './hooks/use_kibana';"],
    ['TypeScript interface export', 'export interface Props {'],
  ])('rejects source code whose first line is a %s', (_name, firstLine) => {
    expect(validateLogSampleContent([firstLine, 'more code'])).toEqual({
      valid: false,
      code: 'script_content',
    });
  });

  it('rejects source code that starts with a license comment', () => {
    const { samples } = normalizeLogSamplesFromFileContent(
      "/*\n * Copyright Elasticsearch B.V.\n */\n\nimport React from 'react';\n"
    );
    expect(validateLogSampleContent(samples)).toEqual({ valid: false, code: 'script_content' });
    expect(
      validateLogSampleContent(['# Licensed under the Apache License', '', 'package main'])
    ).toEqual({ valid: false, code: 'script_content' });
  });

  it.each([
    ['syslog', ['<134>Nov  9 14:06:01 host sshd[123]: Accepted password for root']],
    ['NDJSON', ['{"@timestamp":"2026-11-09T14:06:01Z","message":"ok"}', '{"message":"two"}']],
    ['CSV', ['2026-11-09,login,alice', '2026-11-09,logout,alice']],
    [
      'non-ASCII text',
      ['2026-11-09 ユーザーがログインしました', '2026-11-09 Benutzer abgemeldet ✅'],
    ],
    [
      'U+FFFD-heavy text from a legacy encoding',
      ['2026-11-09 \uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD'],
    ],
    ['text starting with MZ', ['MZ-SRV01 login succeeded']],
    ['a shebang later in the file', ['2026-11-09 started', '#!/bin/sh ran by cron']],
    ['a shebang inside a line', ['2026-11-09 command="#!/bin/sh"']],
    ['a log line starting with "import"', ['import completed: 42 records loaded']],
    ['a log line starting with "function"', ['function handler invoked in 12ms']],
    ['a log line starting with "package"', ['package nginx-1.24.0 installed']],
    ['a log line starting with "class"', ['class loader initialized']],
    ['source code later in the file', ['2026-11-09 deploy started', 'import os']],
    [
      'W3C extended logs with # header lines',
      [
        '#Software: Microsoft Internet Information Services 10.0',
        '#Fields: date time s-ip cs-method cs-uri-stem',
        '2026-11-09 14:06:01 10.0.0.1 GET /index.html',
      ],
    ],
  ])('allows %s', (_name, samples) => {
    expect(validateLogSampleContent(samples)).toEqual({ valid: true });
  });

  it('allows a stray NUL character in otherwise normal logs', () => {
    const samples = Array.from({ length: 20 }, (_, i) => `2026-11-09 line ${i} event=ok`);
    samples[3] = `${samples[3]}\u0000`;
    expect(validateLogSampleContent(samples)).toEqual({ valid: true });
  });

  it('allows device logs with NUL characters on every line', () => {
    const samples = Array.from(
      { length: 20 },
      (_, i) =>
        `<14>Aug 14 2019 13:58:0${
          i % 10
        } mojo_server.pl: siem-management: admin@10.0.255.31, Cloud Services, Page View\u0000x0a\u0000x00`
    );
    expect(validateLogSampleContent(samples)).toEqual({ valid: true });
  });
});
