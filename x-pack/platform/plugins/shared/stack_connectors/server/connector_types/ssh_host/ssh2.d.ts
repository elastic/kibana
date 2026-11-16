/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare module 'ssh2' {
  import type { EventEmitter } from 'events';
  import type { Readable, Writable } from 'stream';

  export interface ConnectConfig {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    privateKey?: Buffer | string;
    tryKeyboard?: boolean;
    readyTimeout?: number;
    keepaliveInterval?: number;
    keepaliveCountMax?: number;
    hostVerifier?: (key: Buffer, verify: (valid: boolean) => void) => boolean | void;
  }

  export interface ExecStream extends EventEmitter {
    stderr: Readable;
    write(data: string | Buffer): boolean;
    end(data?: string | Buffer): this;
    close(): void;
    destroy(): this;
  }

  export interface SftpStats {
    size: number;
  }

  export interface SFTPWrapper {
    stat(path: string, callback: (err: Error | null | undefined, stats: SftpStats) => void): void;
    mkdir(path: string, callback: (err: Error | null | undefined) => void): void;
    createReadStream(path: string): Readable;
    createWriteStream(path: string): Writable;
    end(): void;
  }

  export class Client extends EventEmitter {
    connect(config: ConnectConfig): void;
    exec(command: string, callback: (err: Error | undefined, stream: ExecStream) => void): void;
    sftp(callback: (err: Error | undefined, sftp: SFTPWrapper) => void): void;
    end(): void;
  }

  export const utils: {
    sftp: {
      STATUS_CODE: {
        NO_SUCH_FILE: number;
      };
    };
  };
}
