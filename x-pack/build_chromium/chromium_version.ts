/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT, ToolingLog } from '@kbn/dev-utils';
import chalk from 'chalk';
import cheerio from 'cheerio';
import dedent from 'dedent';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { PackageJson } from 'type-fest';

type PuppeteerRelease = string;
type ChromiumVersion = string;
type ChromiumRevision = string;
type ChromiumCommit = string;

const log = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

// We forked the Puppeteer node module for Kibana,
// So we need to translate OUR version to the official Puppeteer Release
const forkCompatibilityMap: Record<PuppeteerRelease, PuppeteerRelease> = {
  '5.4.1-patch.1': '5.4.1',
};

/*
 * Look at Puppeteer source code in Github for Kibana's version
 * The src/revisions.ts file contains a revision string
 */
async function getPuppeteerRelease(): Promise<PuppeteerRelease> {
  // open node_modules/puppeteer/package.json
  const puppeteerPackageJson: PackageJson = JSON.parse(
    fs.readFileSync(path.resolve(REPO_ROOT, 'node_modules', 'puppeteer', 'package.json'), 'utf8')
  );
  const { version } = puppeteerPackageJson;
  log.info(`Kibana is using Puppeteer ${version} (${forkCompatibilityMap[version]})`);
  return forkCompatibilityMap[version];
}

/*
 * Look at Puppeteer source code in Github for Kibana's version
 * The src/revisions.ts file contains a revision string
 */
async function getChromiumRevision(kibanaPuppeteerVersion): Promise<ChromiumRevision> {
  const url = `https://raw.githubusercontent.com/puppeteer/puppeteer/v${kibanaPuppeteerVersion}/src/revisions.ts`;
  let body: string;
  try {
    log.info(`Fetching code from Puppeteer source: ${url}`);
    const rawSource = await fetch(url);
    body = await rawSource.text();
  } catch (err) {
    log.error(err);
    throw new Error(`Could not fetch ${url}. Check the URL in a browser and try again.`);
  }

  let revision: ChromiumRevision | undefined;
  const lines = body.split('\n');
  let cursor = lines.length;
  while (--cursor >= 0) {
    // look for the line of code matching `  chromium: '0123456',`
    const test = lines[cursor].match(/^\s+chromium: '(\S+)',$/);
    if (test != null) {
      [, revision] = test;
      break;
    }
  }

  if (revision == null) {
    throw new Error(
      `Could not find a Chromium revision listed in Puppeteer source! Check ${url} in a browser`
    );
  }

  log.info(`Found Chromium revision ${revision} from Puppeteer ${kibanaPuppeteerVersion}`);
  return revision;
}

async function getChromiumCommit(revision: ChromiumRevision): Promise<ChromiumCommit> {
  const url = `https://crrev.com/${revision}`;
  log.info(`Fetching ${url}`);
  const pageText = await fetch(url);
  const $ = cheerio.load(await pageText.text());
  log.debug(`Page title: ${$('title').text()}`);

  // get the commit from the page title
  let commit: ChromiumCommit | null = null;
  const matches = $('title')
    .text()
    .match(/\S{40}/);
  if (matches != null) {
    [commit] = matches;
  }

  if (commit == null) {
    throw new Error(`Could not find a Chromium commit! Check ${url} in a browser.`);
  }

  log.info(`Found Chromium commit ${commit} from revision ${revision}.`);
  return commit;
}

function showHelp() {
  log.write(
    dedent(chalk`
      Display the Chromium git commit hash that correlates to a Puppeteer release.

        - {dim Get Chromium commit for the current Puppeteer installation in Kibana:}
          node x-pack/dev-tools/chromium_version

        - {dim Get Chromium commit for Puppeteer v5.5.0:}
          node x-pack/dev-tools/chromium_version 5.5.0

      You can use https://omahaproxy.appspot.com/ to look up the Chromium release that first shipped with that commit.
    `) + '\n'
  );
}

async function chromiumVersion() {
  const argument = process.argv[2];
  if (argument === '--help') {
    showHelp();
    return;
  }

  try {
    let puppeteerVersion: PuppeteerRelease;
    if (argument) {
      puppeteerVersion = argument;
    } else {
      puppeteerVersion = await getPuppeteerRelease();
    }

    const chromiumRevision = await getChromiumRevision(puppeteerVersion);
    const chromiumCommit = await getChromiumCommit(chromiumRevision);
    return chromiumCommit;
  } catch (err) {
    log.error(err);
  }
}

chromiumVersion();
