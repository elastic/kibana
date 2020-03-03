/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChildProcess } from 'child_process';
import blessed from 'blessed';
import util from 'util';

/* eslint-disable no-console */

const logPanels: blessed.Widgets.Log[] = [];
const childProcesses: ChildProcess[] = [];
let _jobs: Job[] = [];
let _screen: blessed.Widgets.Screen;
let _listPanel: blessed.Widgets.ListElement;

let currentJobIndex = 0;

// @ts-ignore
console.log = function(...args: string) {
  _screen.debug(...args);
};

// @ts-ignore
console.error = function(...args: string) {
  _screen.debug(...args);
};

// @ts-ignore
process.on('uncaughtException', err => {
  // @ts-ignore
  _screen.debug(err);
});

process.on('unhandledRejection', err => {
  _screen.debug(err);
});

function updateJobState({
  index,
  state
}: {
  index: number;
  state: 'pending' | 'loading' | 'success' | 'failed';
}) {
  const job = _jobs[index];

  switch (state) {
    case 'pending':
      // @ts-ignore
      _listPanel.setItem(index, `    ${job.label}`);
      break;
    case 'loading':
      // @ts-ignore
      _listPanel.setItem(index, `⏳ ${job.label}`);
      break;
    case 'success':
      // @ts-ignore
      _listPanel.setItem(index, `✅ ${job.label}`);
      break;
    case 'failed':
      // @ts-ignore
      _listPanel.setItem(index, `❌ ${job.label}`);
      break;
  }
}

function addLog({ index, msg }: { index: number; msg: unknown }) {
  const logPanel = logPanels[index];
  // @ts-ignore
  logPanel.log(msg);
}

type PromiseOrStream =
  | Promise<string>
  | ChildProcess
  | Promise<ChildProcess>
  | undefined;

export type Job = {
  label: string;
  //
  setup?: () => PromiseOrStream;
  stop?: () => PromiseOrStream;
} & {
  start: () => PromiseOrStream;
  status?: () => Promise<boolean>;
};

function jobHasStatus(
  job: Job
): job is Job & { status: () => Promise<boolean> } {
  return 'status' in job;
}

function isPromise(maybePromise: unknown): maybePromise is Promise<unknown> {
  return util.types.isPromise(maybePromise);
}

async function handlePromiseOrStream({
  promiseOrStream,
  index
}: {
  promiseOrStream: PromiseOrStream;
  index: number;
}): Promise<void> {
  const logPanel = logPanels[index];
  const job = _jobs[index];

  if (!promiseOrStream) {
    return;
  }

  // start job returned a buffer (string)
  if (isPromise(promiseOrStream)) {
    const res = await promiseOrStream;

    if (typeof res === 'string') {
      logPanel.log(res);
      return;

      // start job returned a promise stream (child process)
    } else {
      return await handlePromiseOrStream({ promiseOrStream: res, index });
    }
  }
  // start job returned a stream (child process)
  const child = promiseOrStream;
  childProcesses[index] = child;

  child.stdout.on('data', data => {
    const string = data.toString();
    logPanel.log(string);
  });

  child.stderr.on('data', data => {
    const string = data.toString();
    logPanel.log(string);
  });

  const promisesToRace = [];

  // wait for process exiting
  const waitForExit = new Promise<number | null>((resolve, reject) => {
    child.on('error', e => {
      reject(e);
    });
    child.on('exit', code => resolve(code));
    child.on('close', code => resolve(code));
  }).then(code => {
    if (code !== 0) {
      throw new Error(`Invalid exit code ${code}`);
    }
  });
  promisesToRace.push(waitForExit);

  // wait for status to complete
  if (jobHasStatus(job)) {
    const waitForStatus = waitFor(job.status, { retries: 5000, interval: 500 });
    promisesToRace.push(waitForStatus);
  }

  await Promise.race(promisesToRace);
}

async function startJob(index: number) {
  const job = _jobs[index];
  const logPanel = logPanels[index];

  try {
    updateJobState({ index, state: 'loading' });

    logPanel.log(`\n{bold}===Running start==={/bold}\n`);
    const jobStartResponse = job.start();
    await handlePromiseOrStream({ promiseOrStream: jobStartResponse, index });

    updateJobState({ index, state: 'success' });
  } catch (e) {
    logPanel.log(e);
    updateJobState({ index, state: 'failed' });
    throw e;
  }
}

async function setupJob(index: number) {
  const job = _jobs[index];
  if (job.setup) {
    const logPanel = logPanels[index];

    logPanel.log(`\n{bold}===Running setup==={/bold}\n`);

    try {
      updateJobState({ index, state: 'loading' });

      const jobSetupResponse = job.setup();
      await handlePromiseOrStream({ promiseOrStream: jobSetupResponse, index });
    } catch (e) {
      logPanel.log(e);
      updateJobState({ index, state: 'failed' });
      throw e;
    }
  }
}

export async function startTaskManager(jobs: Job[]) {
  _jobs = jobs;
  _screen = createBlessedScreen();
  _listPanel = createListPanel();

  for (const index of jobs.keys()) {
    // create log and hide it unless it's the first
    const logPanel = createLogPanel();
    logPanels.push(logPanel);
    if (index > 0) {
      logPanel.hide();
    }

    _listPanel.select(index);
    updateJobState({ index, state: 'loading' });

    await setupJob(index);
    await startJob(index);
  }
}

async function waitFor(
  cb: () => Promise<boolean>,
  { retries = 50, interval = 100 }: { retries: number; interval: number }
): Promise<boolean> {
  if (retries === 0) {
    throw new Error(`Maximum number of retries reached`);
  }

  let res: boolean;
  try {
    res = await cb();
  } catch (e) {
    res = false;
  }

  if (!res) {
    await new Promise(resolve => setTimeout(resolve, interval));
    return waitFor(cb, { retries: retries - 1, interval });
  }

  return res;
}

function createBlessedScreen() {
  const screen = blessed.screen({
    debug: true
  });
  // Quit on Escape, q, or Control-C.
  screen.key(['escape', 'q', 'C-c', 'c'], () => {
    return process.exit(0);
  });
  return screen;
}

function createListPanel() {
  const listPanel = blessed.list({
    items: _jobs.map(job => `   ${job.label}`),
    top: '0',
    left: '0',
    width: '40%',
    autoPadding: true,
    height: '100%',
    keys: true,
    border: 'line',
    style: {
      selected: {
        bg: '#dddddd',
        fg: 'black'
      }
    }
  });

  // clicking enter on a job should restart it
  listPanel.key(['enter'], async function() {
    // @ts-ignore
    const index: number = this.selected;
    const child = childProcesses[index];
    if (child) {
      child.kill('SIGINT');
    }

    // run stop command
    const job = _jobs[index];
    if (job.stop) {
      // TODO
    }

    // give the child time to close
    setTimeout(() => {
      addLog({ index, msg: 'Restarting...' });
      startJob(index);
    }, 300);
  });

  // hovering over a job should display its logs
  listPanel.on('select item', (elm, index) => {
    if (logPanels[index] && logPanels[index].hidden) {
      logPanels[index].show();
    }

    if (logPanels[currentJobIndex] != null) {
      logPanels[currentJobIndex].hide();
    }

    currentJobIndex = index;
  });

  _screen.append(listPanel);

  // ensure list always has focus so it can be controlled with keyboard
  listPanel.focus();
  listPanel.on('blur', () => {
    setTimeout(() => {
      listPanel.focus();
    }, 100);
  });

  return listPanel;
}

function createLogPanel() {
  const logPanel = blessed.log({
    mouse: true, // needed for scrolling with mouse wheel
    top: '0',
    right: '0',
    tags: true,
    autoPadding: true,
    width: '60%',
    height: '100%',
    border: 'line',
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      style: {
        inverse: true
      }
    }
  });
  _screen.append(logPanel);
  return logPanel;
}
