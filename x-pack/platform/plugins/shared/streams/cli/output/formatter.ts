/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';

export interface OutputOptions {
  log: ToolingLog;
  isJsonMode: boolean;
}

export class Formatter {
  private readonly log: ToolingLog;
  private readonly isJsonMode: boolean;

  constructor(options: OutputOptions) {
    this.log = options.log;
    this.isJsonMode = options.isJsonMode;
  }

  /**
   * Output JSON data. In JSON mode, writes raw JSON to stdout.
   * In human mode, writes formatted JSON.
   */
  json(data: unknown): void {
    if (this.isJsonMode) {
      // In JSON mode, write directly to stdout without any decoration
      process.stdout.write(JSON.stringify(data) + '\n');
    } else {
      this.log.write(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Output a simple message. Skipped in JSON mode.
   */
  message(text: string): void {
    if (!this.isJsonMode) {
      this.log.write(text);
    }
  }

  /**
   * Output a success message. Skipped in JSON mode.
   */
  success(text: string): void {
    if (!this.isJsonMode) {
      this.log.success(text);
    }
  }

  /**
   * Output a warning message. Skipped in JSON mode.
   */
  warning(text: string): void {
    if (!this.isJsonMode) {
      this.log.warning(text);
    }
  }

  /**
   * Output an error message.
   * In JSON mode, outputs error as JSON object.
   */
  error(message: string, statusCode?: number): void {
    if (this.isJsonMode) {
      const errorObj: Record<string, unknown> = { error: message };
      if (statusCode !== undefined) {
        errorObj.statusCode = statusCode;
      }
      process.stdout.write(JSON.stringify(errorObj) + '\n');
    } else {
      this.log.error(message);
    }
  }

  /**
   * Format a list of streams for human output
   */
  streamList(streams: Array<{ name: string; [key: string]: unknown }>): void {
    if (this.isJsonMode) {
      this.json({ streams });
      return;
    }

    if (streams.length === 0) {
      this.message('No streams found.');
      return;
    }

    this.message('Streams:');
    for (const stream of streams) {
      const parts = [stream.name];

      // Add type if available
      const type = this.getStreamType(stream);
      if (type) {
        parts.push(`(${type})`);
      }

      this.message(`  - ${parts.join(' ')}`);
    }
  }

  /**
   * Format a single stream for human output
   */
  stream(stream: { name: string; [key: string]: unknown }): void {
    if (this.isJsonMode) {
      this.json({ stream });
      return;
    }

    this.message(`Stream: ${stream.name}`);

    const type = this.getStreamType(stream);
    if (type) {
      this.message(`  Type: ${type}`);
    }

    // Show additional properties
    for (const [key, value] of Object.entries(stream)) {
      if (key === 'name') continue;
      if (typeof value === 'object' && value !== null) {
        this.message(`  ${key}: ${JSON.stringify(value, null, 2).split('\n').join('\n    ')}`);
      } else {
        this.message(`  ${key}: ${value}`);
      }
    }
  }

  /**
   * Format a list of features for human output
   */
  featureList(features: Array<{ id?: string; name?: string; [key: string]: unknown }>): void {
    if (this.isJsonMode) {
      this.json({ features });
      return;
    }

    if (features.length === 0) {
      this.message('No features found.');
      return;
    }

    this.message('Features:');
    for (const feature of features) {
      const name = feature.name || feature.id || 'unknown';
      const type = feature.type ? ` (${feature.type})` : '';
      this.message(`  - ${name}${type}`);
    }
  }

  /**
   * Format acknowledged response
   */
  acknowledged(action: string): void {
    if (this.isJsonMode) {
      this.json({ success: true, acknowledged: true });
    } else {
      this.success(`${action} successful.`);
    }
  }

  /**
   * Format task status
   */
  taskStatus(status: Record<string, unknown>): void {
    if (this.isJsonMode) {
      this.json({ status });
      return;
    }

    this.message('Task Status:');
    for (const [key, value] of Object.entries(status)) {
      if (typeof value === 'object' && value !== null) {
        this.message(`  ${key}: ${JSON.stringify(value)}`);
      } else {
        this.message(`  ${key}: ${value}`);
      }
    }
  }

  private getStreamType(stream: Record<string, unknown>): string | undefined {
    // Determine stream type from its structure
    if ('stream' in stream) {
      const inner = stream.stream as Record<string, unknown>;
      if ('ingest' in inner && inner.ingest && typeof inner.ingest === 'object') {
        const ingest = inner.ingest as Record<string, unknown>;
        if ('routing' in ingest) {
          return 'wired';
        }
      }
    }
    return undefined;
  }
}
