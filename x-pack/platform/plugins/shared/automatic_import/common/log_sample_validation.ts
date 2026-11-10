/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * These checks only reject content that is clearly not log data. Anything ambiguous is accepted.
 */

interface ValidLogSample {
  valid: true;
}

export type LogSampleFileNameValidationResult =
  | ValidLogSample
  | { valid: false; code: 'blocked_extension' | 'compressed_file'; extension: string };

export type LogSampleSignatureValidationResult =
  | ValidLogSample
  | { valid: false; code: 'binary_file' };

export type LogSampleContentValidationResult =
  | ValidLogSample
  | { valid: false; code: 'binary_content' | 'script_content' | 'empty' };

export type LogSampleValidationResult =
  | LogSampleFileNameValidationResult
  | LogSampleSignatureValidationResult
  | LogSampleContentValidationResult;

const VALID: ValidLogSample = { valid: true };

const COMPRESSED_EXTENSIONS: ReadonlySet<string> = new Set([
  'zip',
  'gz',
  'tgz',
  'tar',
  '7z',
  'rar',
  'bz2',
  'xz',
]);

const BLOCKED_EXTENSIONS: ReadonlySet<string> = new Set([
  // Images
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'webp',
  'svg',
  'ico',
  'tif',
  'tiff',
  'heic',
  // Documents
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  // Binaries
  'exe',
  'dll',
  'so',
  'dylib',
  'bin',
  'class',
  'jar',
  'pyc',
  'wasm',
  // Scripts and source code
  'py',
  'js',
  'mjs',
  'ts',
  'sh',
  'bash',
  'zsh',
  'ps1',
  'psm1',
  'bat',
  'cmd',
  'rb',
  'php',
  'pl',
  'java',
  'go',
  'c',
  'cpp',
  'h',
  'cs',
  'rs',
  'swift',
  'kt',
  // Configuration
  'yml',
  'yaml',
  'toml',
  'ini',
  'properties',
]);

/**
 * Signatures that contain non-printable bytes or are very unlikely at the start of a text log.
 * Windows PE (`MZ`) is intentionally excluded because it is two printable letters.
 */
const BINARY_FILE_SIGNATURES: ReadonlyArray<readonly number[]> = [
  [0xff, 0xd8, 0xff], // JPEG
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
  [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
  [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
  [0x50, 0x4b, 0x03, 0x04], // ZIP, including Office documents
  [0x50, 0x4b, 0x05, 0x06], // Empty ZIP
  [0x1f, 0x8b], // GZIP
  [0x7f, 0x45, 0x4c, 0x46], // ELF
  [0xfe, 0xed, 0xfa, 0xce], // Mach-O 32-bit
  [0xfe, 0xed, 0xfa, 0xcf], // Mach-O 64-bit
  [0xce, 0xfa, 0xed, 0xfe], // Mach-O 32-bit, reversed byte order
  [0xcf, 0xfa, 0xed, 0xfe], // Mach-O 64-bit, reversed byte order
  [0xca, 0xfe, 0xba, 0xbe], // Mach-O universal binary and Java class
];

/** Number of leading file bytes needed by `validateLogSampleFileSignature`. */
export const LOG_SAMPLE_SIGNATURE_BYTES = Math.max(
  ...BINARY_FILE_SIGNATURES.map((signature) => signature.length)
);

/**
 * Some devices (for example Cisco FTD and FortiGate) emit a few NUL characters per line, which
 * reaches ~2% of the text, while binary files are typically well above 5% NUL.
 */
const MAX_NUL_CHARACTER_RATIO = 0.05;

/** First-line patterns that are typical of scripts and source code but not of log events. */
const SOURCE_CODE_FIRST_LINE_PATTERNS: readonly RegExp[] = [
  /^#!/, // Shebang
  /^("""|''')/, // Python docstring
  /^import\s+[\w.]+(\s+as\s+\w+)?(\s*,\s*[\w.]+)*\s*;?$/, // Python or Java import
  /^import\s+(type\s*)?[{*'"]/, // JavaScript or TypeScript import
  /^import\s+(type\s+)?\w+\s+from\s+['"]/, // JavaScript or TypeScript default import
  /^export\s*(\{|\*|(default|type|interface|class|enum)\s)/, // JavaScript or TypeScript export
  /^from\s+[\w.]+\s+import\s+/, // Python from-import
  /^def\s+\w+\s*\(/, // Python function
  /^class\s+\w+(?!\w).*[:{]$/, // Class declaration
  /^package\s+[\w.]+;?$/, // Java or Go package
  /^using\s+[\w.]+;$/, // C# using directive
  /^#include\s*[<"]/, // C or C++ include
  /^<\?php/, // PHP
  /^['"]use strict['"];?$/, // JavaScript strict mode
  /^module\.exports\s*=/, // CommonJS export
  /^(export\s+)?(async\s+)?function(\s+\w+)?\s*\(/, // JavaScript function
  /^(export\s+)?(const|let|var)\s+\w+\s*=/, // JavaScript variable
];

/** Comment lines that often precede the first line of code, such as license headers. */
const LEADING_COMMENT_LINE_PATTERN = /^(\/\/|\/\*|\*|#(?!!|include\b))/;

const MAX_LEADING_COMMENT_LINES = 50;

/** A first line of source code is short, and the length cap bounds the cost of the patterns. */
const MAX_SOURCE_CODE_FIRST_LINE_LENGTH = 1_000;

const getFirstNonCommentLine = (samples: readonly string[]): string | undefined =>
  samples
    .slice(0, MAX_LEADING_COMMENT_LINES + 1)
    .map((sample) => sample.trim())
    .find((line) => !LEADING_COMMENT_LINE_PATTERN.test(line));

const getFileExtension = (fileName: string): string | undefined => {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return undefined;
  }
  return fileName.slice(dotIndex + 1).toLowerCase();
};

/** Rejects file names whose final extension is a known non-log type. */
export const validateLogSampleFileName = (fileName: string): LogSampleFileNameValidationResult => {
  const extension = getFileExtension(fileName);
  if (!extension) {
    return VALID;
  }
  if (COMPRESSED_EXTENSIONS.has(extension)) {
    return { valid: false, code: 'compressed_file', extension };
  }
  if (BLOCKED_EXTENSIONS.has(extension)) {
    return { valid: false, code: 'blocked_extension', extension };
  }
  return VALID;
};

/** Rejects files whose leading bytes match a known binary file signature. */
export const validateLogSampleFileSignature = (
  bytes: Uint8Array
): LogSampleSignatureValidationResult => {
  const isBinary = BINARY_FILE_SIGNATURES.some(
    (signature) =>
      bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
  );
  return isBinary ? { valid: false, code: 'binary_file' } : VALID;
};

/** Rejects samples that are empty, mostly NUL characters, or start like a script or source code. */
export const validateLogSampleContent = (
  samples: readonly string[]
): LogSampleContentValidationResult => {
  const nonEmptySamples = samples.filter((sample) => sample.trim().length > 0);
  if (nonEmptySamples.length === 0) {
    return { valid: false, code: 'empty' };
  }

  let totalCharacters = 0;
  let nulCharacters = 0;
  for (const sample of nonEmptySamples) {
    totalCharacters += sample.length;
    for (let index = 0; index < sample.length; index++) {
      if (sample.charCodeAt(index) === 0) {
        nulCharacters++;
      }
    }
  }
  if (nulCharacters / totalCharacters > MAX_NUL_CHARACTER_RATIO) {
    return { valid: false, code: 'binary_content' };
  }

  const firstLine = getFirstNonCommentLine(nonEmptySamples);
  if (
    firstLine !== undefined &&
    firstLine.length <= MAX_SOURCE_CODE_FIRST_LINE_LENGTH &&
    SOURCE_CODE_FIRST_LINE_PATTERNS.some((pattern) => pattern.test(firstLine))
  ) {
    return { valid: false, code: 'script_content' };
  }

  return VALID;
};
