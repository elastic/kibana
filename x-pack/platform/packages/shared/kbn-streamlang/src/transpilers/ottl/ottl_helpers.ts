/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Escapes special characters in strings for OTTL expressions
 */
export function escapeOTTLString(value: string): string {
  return value
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/"/g, '\\"') // Escape quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
}

/**
 * Converts a JavaScript value to an OTTL literal
 */
export function valueToOTTLLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return 'nil';
  }

  if (typeof value === 'string') {
    return `"${escapeOTTLString(value)}"`;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    return `[${value.map(valueToOTTLLiteral).join(', ')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([k, v]) => `"${escapeOTTLString(k)}": ${valueToOTTLLiteral(v)}`
    );
    return `{${entries.join(', ')}}`;
  }

  return String(value);
}

/**
 * Sanitizes stream/pipeline names for use in OTEL config
 */
export function sanitizePipelineName(name: string): string {
  return name.replace(/[\/.]/g, '_');
}

/**
 * Gets the pipeline name for a stream
 */
export function getPipelineName(streamName: string): string {
  return `logs/${sanitizePipelineName(streamName)}`;
}

/**
 * Converts Java date format patterns to Go time format
 * This is a simplified mapping for common patterns
 */
export function convertJavaDateFormatToGo(javaFormat: string): string {
  const mappings: Record<string, string> = {
    "yyyy-MM-dd'T'HH:mm:ss.SSSZ": '2006-01-02T15:04:05.000Z07:00',
    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'": '2006-01-02T15:04:05.000Z',
    "yyyy-MM-dd'T'HH:mm:ss'Z'": '2006-01-02T15:04:05Z',
    "yyyy-MM-dd'T'HH:mm:ssZ": '2006-01-02T15:04:05Z07:00',
    'yyyy-MM-dd HH:mm:ss': '2006-01-02 15:04:05',
    'yyyy-MM-dd': '2006-01-02',
    'dd/MMM/yyyy:HH:mm:ss Z': '02/Jan/2006:15:04:05 Z07:00',
    ISO8601: '2006-01-02T15:04:05.000Z07:00',
    UNIX: 'unix',
    UNIX_MS: 'unix_ms',
  };

  return mappings[javaFormat] || javaFormat;
}

/**
 * Converts dissect pattern to a rough regex pattern
 * This is a simplified conversion - not perfect but works for basic cases
 */
export function convertDissectToRegex(dissectPattern: string): string {
  // Convert %{field} to named capture groups
  // %{field} → (?P<field>\S+) for most cases
  // More complex patterns would need additional logic
  return dissectPattern.replace(/%\{([^}]+)\}/g, (match, fieldName) => {
    // Handle optional padding/modifiers (simplified)
    const cleanFieldName = fieldName.replace(/[+\-\/>]/g, '');
    return `(?P<${cleanFieldName}>\\S+)`;
  });
}
