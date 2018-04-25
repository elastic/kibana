/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import mkdirp from 'mkdirp';
import { promisify } from 'bluebird';
import { platformArchives } from './platform_archives';
import { createZip } from './create_zip';

const DEPOT_TOOLS_GIT_URL = 'https://chromium.googlesource.com/chromium/tools/depot_tools.git';

class Paths {
  constructor(workspace) {
    this.workspace = workspace;
    this.depotTools = path.join(this.workspace, 'depot_tools');
    this.chromium = path.join(this.workspace, 'chromium');
    this.chromiumSrc = path.join(this.chromium, 'src');
    this.gclientConfig = path.join(this.chromium, '.gclient');
    this.headlessOutput = path.join(this.chromiumSrc, 'out', 'Headless');
    this.headlessOutputArgs = path.join(this.headlessOutput, 'args.gn');
    this.target = path.join(this.workspace, 'target');
  }

  getHeadlessArgs = (platform) => path.join(__dirname, `${platform}.args.gn`);
}

const fsp = {
  mkdir: promisify(fs.mkdir, fs),
  mkdirp: promisify(mkdirp),
  readFile: promisify(fs.readFile, fs),
  writeFile: promisify(fs.writeFile, fs),
};

const log = (msg) => {
  console.log(msg);
};

const fromExitCode = (process) => {
  return new Promise((resolve, reject) => {
    process.on('exit', code => code === 0 ? resolve() : reject(new Error(`Child process exited with code ${code}`)));
  });
};

const printOutput = (proc) => {
  proc.stdout.on('data', buffer => console.log(buffer.toString()));
  proc.stderr.on('data', buffer => console.error(buffer.toString()));
  return proc;
};

const pathEnvName = process.platform === 'win32' ? 'Path' : 'PATH';

export async function build(command) {
  const paths = new Paths(command.workspace);
  if (!fs.existsSync(paths.workspace)) {
    log(`creating workspace`);
    await fsp.mkdir(paths.workspace);
  }

  log('setting up depot_tools');
  if (!fs.existsSync(paths.depotTools)) {
    log(`cloning depot_tools`);
    await fromExitCode(spawn('git', ['clone', DEPOT_TOOLS_GIT_URL, paths.depotTools], { cwd: paths.workspace, shell: true }));
  } else {
    log(`depot_tools already cloned, updating`);
    await fromExitCode(spawn('git', ['pull'], { cwd: paths.depotTools, env: process.env, shell: true }));
  }

  const depotToolsPathEnv = {
    ...process.env,
    DEPOT_TOOLS_WIN_TOOLCHAIN: 0,
    [pathEnvName]: `${process.env[pathEnvName]}${path.delimiter}${paths.depotTools}`,
  };

  if (!fs.existsSync(paths.chromium)) {
    log(`creating chromium directory`);
    await fsp.mkdir(paths.chromium);
  }

  if (!fs.existsSync(paths.gclientConfig)) {
    log(`creating .gclient`);
    const solution = `{
      'url': 'https://chromium.googlesource.com/chromium/src.git',
      'managed': False,
      'name': 'src',
      'deps_file': '.DEPS.git',
      'custom_deps': {},
    }`.replace(/\n/g, '');
    await fromExitCode(printOutput(spawn('gclient', [
      'config',
      `--spec "solutions=[${solution.replace(/\n/g, '')}]"`
    ], { cwd: paths.chromium, env: depotToolsPathEnv, shell: true })));
  }

  log(`syncing src`);
  await fromExitCode(printOutput(spawn('gclient', [
    'sync',
    '-r',
    `src@${command.gitSha}`,
    '--no-history',
    '--nohooks'
  ], { cwd: paths.chromium, env: depotToolsPathEnv, shell: true })));

  if (process.platform === 'linux') {
    log(`installing build dependencies`);
    await fromExitCode(printOutput(spawn('build/install-build-deps.sh', [
      '--no-prompt',
      '--no-nacl'
    ], { cwd: paths.chromiumSrc, env: depotToolsPathEnv, shell: true })));
  }

  log(`running hooks`);
  await fromExitCode(printOutput(spawn('gclient', [
    'runhooks'
  ], { cwd: paths.chromium, env: depotToolsPathEnv, shell: true })));

  log(`generating ninja`);
  await fsp.mkdirp(paths.headlessOutput);

  const argsContent = await fsp.readFile(paths.getHeadlessArgs(process.platform));
  await fsp.writeFile(paths.headlessOutputArgs, argsContent);

  await fromExitCode(printOutput(spawn('gn', [
    'gen',
    'out/Headless'
  ], { cwd: paths.chromiumSrc, env: depotToolsPathEnv, shell: true })));

  log("building");
  await fromExitCode(printOutput(spawn('ninja', [
    `-C ${paths.headlessOutput}`, 'headless_shell'
  ], { cwd: paths.chromiumSrc, env: depotToolsPathEnv, shell: true })));


  if (!fs.existsSync(paths.target)) {
    log(`creating target folder`);
    await fsp.mkdir(paths.target);
  }

  const platformArchive = platformArchives[process.platform];
  const zipFilename = `chromium-${command.gitSha.substr(0, 7)}-${process.platform}.zip`;
  await createZip(paths.headlessOutput, platformArchive.files, platformArchive.directoryName, paths.target, zipFilename);

  console.log(`Archive created at ${path.join(paths.target, zipFilename)}`);
}
