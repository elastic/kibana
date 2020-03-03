/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { spawn } from 'child_process';

export async function getExitCode(...args: Parameters<typeof spawn>) {
  return new Promise<number | null>((resolve, reject) => {
    const child = spawn(...args);
    child.on('exit', code => resolve(code));
  });
}

export async function syncGitRepo({ url, cwd }: { url: string; cwd: string }) {
  const repoPath = path.resolve(cwd, 'apm-integration-testing');
  if (fs.existsSync(repoPath)) {
    console.log('pulling');
    return spawn('git', ['pull'], { cwd: repoPath });
  }

  console.log('cloning');
  return spawn('git', ['clone', 'url'], { cwd });
}

export async function downloadFile(url: string, filename: string) {
  const res = await axios({ url, responseType: 'stream' });
  res.data.pipe(fs.createWriteStream(filename));

  return new Promise(resolve => {
    res.data.on('end', resolve);
  });

  // const res = await fetch(url);
  // const dest = fs.createWriteStream(filename);
  // res.body.pipe(dest);

  // return new Promise(resolve => {
  //   res.body.on('end', resolve);
  // });
}
