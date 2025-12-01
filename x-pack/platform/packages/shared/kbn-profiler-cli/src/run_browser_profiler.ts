/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// playwright is in root package.json dependencies, managed at workspace level

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type CDPSession,
} from 'playwright';
import Fs from 'fs/promises';
import Path from 'path';
import Os from 'os';
import type { RunOptions } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';

const runOptions: RunOptions = {
  description: 'Browser profiler for capturing frontend CPU profiles using Playwright',
  flags: {
    string: ['timestamp', 'url'],
    help: `
      --timestamp        Timestamp for output filename (format: YYYYMMDD-HHmmss) [required]
      --url              URL to profile (default: http://localhost:5601)
    `,
  },
  log: {
    context: 'profile-browser',
    defaultLevel: 'info',
  },
};

interface BrowserProfilerState {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  client?: CDPSession;
  isShuttingDown: boolean;
  profileSaved: boolean;
  outputPath: string;
}

/**
 * Run browser profiler to capture frontend CPU profiles
 */
export function runBrowserProfiler(): void {
  void run(async ({ log, flagsReader }) => {
    const timestamp = flagsReader.string('timestamp');
    const url = flagsReader.string('url') ?? 'http://localhost:5601';

    if (!timestamp) {
      log.error('Error: --timestamp argument is required');
      log.error(
        'Usage: node scripts/profile_browser.js --timestamp=YYYYMMDD-HHmmss [--url=http://localhost:5601]'
      );
      process.exit(1);
    }

    await runBrowserProfilerWithLog(log, timestamp, url);
  }, runOptions);
}

export async function runBrowserProfilerWithLog(
  log: ToolingLog,
  timestamp: string,
  url: string
): Promise<void> {
  // Setup output directory (same as kbn-profiler-cli)
  const outputDir = Path.join(Os.tmpdir(), 'kbn-profiler-cli-profiles');
  await Fs.mkdir(outputDir, { recursive: true });

  const outputPath = Path.join(outputDir, `profile-${timestamp}-frontend.cpuprofile`);

  // Setup shared state for signal handling
  const state: BrowserProfilerState = {
    isShuttingDown: false,
    profileSaved: false,
    outputPath,
  };

  log.info('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  state.browser = browser;

  log.success('Browser launched successfully');

  try {
    log.info('Creating browser context...');
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    state.context = context;

    log.info('Creating new page...');
    const page = await context.newPage();
    state.page = page;

    log.info('Getting CDP session...');
    const client = await context.newCDPSession(page);
    state.client = client;
    log.success('CDP session established');

    log.info(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    log.success('Navigation complete');

    log.info('Enabling CPU profiler...');
    await client.send('Profiler.enable');
    log.success('Profiler enabled');

    log.info('Setting sampling interval...');
    await client.send('Profiler.setSamplingInterval', { interval: 1000 }); // 1μs sampling (1000μs = 1ms)
    log.success('Sampling interval set');

    log.info('Starting profiler...');
    await client.send('Profiler.start');
    log.success('Profiler started');

    log.write('');
    log.success('Browser profiling started. Ready.');
    log.write('');

    // Define saveProfile function
    const saveProfile = async () => {
      if (state.profileSaved) {
        log.debug('Profile already saved, skipping');
        return;
      }

      try {
        // Check if page is closed before attempting
        if (state.page && state.page.isClosed()) {
          log.warning('Page is already closed, cannot save profile');
          log.warning(
            'Tip: Do not close the browser window manually - use the Stop Recording button'
          );
          return;
        }

        log.info('Stopping profiler to extract profile...');
        const result = await state.client!.send('Profiler.stop');
        log.success('Profiler stopped, profile received');

        log.info('Disabling profiler...');
        await state.client!.send('Profiler.disable');
        log.success('Profiler disabled');

        log.info(`Writing profile to ${state.outputPath}...`);
        await Fs.writeFile(state.outputPath, JSON.stringify(result.profile, null, 2));
        log.success(`Profile saved successfully to ${state.outputPath}`);
        log.info(`Profile size: ${JSON.stringify(result.profile).length} bytes`);
        state.profileSaved = true;
      } catch (error) {
        log.error(`Error saving profile: ${(error as Error).message}`);
        if ((error as Error).message?.includes('closed')) {
          log.error('The browser/page was closed before the profile could be extracted.');
          log.error(
            'Please do not close the browser window manually - use the Stop Recording button in VSCode.'
          );
        } else {
          log.error(`Error stack: ${(error as Error).stack}`);
        }
      }
    };

    const shutdown = async (signal: string) => {
      if (state.isShuttingDown) {
        log.debug('Already shutting down, ignoring duplicate signal');
        return;
      }
      state.isShuttingDown = true;

      log.info(`Received ${signal || 'shutdown'} signal, stopping browser profiler...`);

      // Try to save profile IMMEDIATELY without any checks that might take time
      await saveProfile();

      // Don't bother closing the browser - just exit
      // This avoids race conditions where browser closes before we can save
      log.info('Exiting process (browser will be cleaned up automatically)');
      process.exit(0);
    };

    // Listen for browser disconnect to try saving profile before it's too late
    browser.on('disconnected', async () => {
      log.debug('Browser disconnected event fired');
      if (!state.profileSaved && !state.isShuttingDown) {
        log.warning('Browser disconnected unexpectedly, profile may not have been saved');
      }
    });

    // Listen for page/context close events
    page.on('close', async () => {
      log.debug('Page close event fired');
      if (!state.profileSaved && !state.isShuttingDown) {
        log.warning('Page closed before profile could be saved');
      }
    });

    context.on('close', async () => {
      log.debug('Context close event fired');
      if (!state.profileSaved && !state.isShuttingDown) {
        log.warning('Context closed before profile could be saved');
      }
    });

    // Handle SIGINT (Ctrl+C) and SIGTERM
    log.debug('Setting up signal handlers...');
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    log.debug('Signal handlers ready');

    // Also listen for 'stop' command on stdin as a more reliable alternative
    log.debug('Listening for stop command on stdin...');
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
      const command = data.toString().trim();
      log.debug(`Received stdin command: ${command}`);
      if (command === 'stop') {
        shutdown('stdin-stop');
      }
    });

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    log.error(`Error during browser profiling: ${error}`);
    await browser.close();
    process.exit(1);
  }
}
