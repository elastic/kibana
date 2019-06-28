/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import LockFile from 'proper-lockfile';
import stream from 'stream';
import { RepoCmd, RepoConfig } from '../../model/workspace';
import { Logger } from '../log';

export class WorkspaceCommand {
  constructor(
    readonly repoConfig: RepoConfig,
    readonly workspaceDir: string,
    readonly revision: string,
    readonly log: Logger
  ) {}

  public async runInit(force: boolean) {
    if (this.repoConfig.init) {
      const versionFile = path.join(this.workspaceDir, 'init.version');
      if (this.checkRevision(versionFile) && !force) {
        this.log.info('a same revision exists, init cmd skipped.');
        return;
      }
      const lockFile = this.workspaceDir; // path.join(this.workspaceDir, 'init.lock');

      const isLocked = await LockFile.check(lockFile);
      if (isLocked) {
        this.log.info('another process is running, please try again later');
        return;
      }
      const release = await LockFile.lock(lockFile);

      try {
        const process = this.spawnProcess(this.repoConfig.init);
        const logFile = path.join(this.workspaceDir, 'init.log');
        const logFileStream = fs.createWriteStream(logFile, { encoding: 'utf-8', flags: 'a+' });
        this.redirectOutput(process.stdout, logFileStream);
        this.redirectOutput(process.stderr, logFileStream, true);
        process.on('close', async (code, signal) => {
          logFileStream.close();
          await this.writeRevisionFile(versionFile);
          this.log.info(`init process finished with code: ${code} signal: ${signal}`);
          await release();
        });
      } catch (e) {
        this.log.error(e);
        release();
      }
    }
  }

  private spawnProcess(repoCmd: RepoCmd) {
    let cmd: string;
    let args: string[];
    if (typeof repoCmd === 'string') {
      cmd = repoCmd;
      args = [];
    } else {
      [cmd, ...args] = repoCmd as string[];
    }
    return spawn(cmd, args, {
      detached: false,
      cwd: this.workspaceDir,
    });
  }

  private redirectOutput(from: stream.Readable, to: fs.WriteStream, isError: boolean = false) {
    from.on('data', (data: Buffer) => {
      if (isError) {
        this.log.error(data.toString('utf-8'));
      } else {
        this.log.info(data.toString('utf-8'));
      }
      to.write(data);
    });
  }

  /**
   * check the revision file in workspace, return true if it exists and its content equals current revision.
   * @param versionFile
   */
  private checkRevision(versionFile: string) {
    if (fs.existsSync(versionFile)) {
      const revision = fs.readFileSync(versionFile, 'utf8').trim();
      return revision === this.revision;
    }
    return false;
  }

  private writeRevisionFile(versionFile: string) {
    return new Promise((resolve, reject) => {
      fs.writeFile(versionFile, this.revision, err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }
}
