/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { setTimeout, clearTimeout } from 'timers';
import request from 'superagent';
import { asyncForEachWithLimit } from '@kbn/std';
import { FtrProviderContext } from '../ftr_provider_context';

export function LinkCheckerServiceProvider({ getService }: FtrProviderContext) {
  const lifeCycle = getService('lifecycle');
  const log = getService('log');
  const find = getService('find');
  let currentPromise: Promise<void> | undefined;
  let currentTimer: NodeJS.Timer | undefined;
  const badLinks: string[] = [];
  const seenUrls = new Set<string>([]);

  async function checkForBadLinks() {
    // check for bad links and write them to the bad links array
    // let url;

    const linkList = await find.allByCssSelector('a', 100);
    log.debug(`\n>>>>>>>>>>>>>>>>>>>>>>>>>>>> found ${linkList.length} links`);

    await asyncForEachWithLimit(linkList, 20, async (link) => {
      try {
        const url = await link.getAttribute('href');
        // if url is NOT in urls, add it and test it
        if (seenUrls.has(url)) {
          log.debug(`----- ${url} is already in set`);
        } else {
          seenUrls.add(url);
          try {
            const response = await request.head(url);
            log.debug(`${url} response: ${response.status}`);
            if (response.status >= 400) {
              badLinks.push(url);
              log.error(`bad url found ${url} response: ${response.status}`);
            }
          } catch (err) {
            log.debug(err);
          }
        }
      } catch (err) {
        // this should catch the stale element exceptions that happen
        // when the page changes after we get the 'a' elements when we try to get the 'href's.
      }
    });
    // const deadlinks = links.flatMap((l) => (l && l.code >= 400 ? l : []));
    // if (deadlinks.length > 0) {
    //   deadlinks.forEach((l) => log.debug(`${l.url} response: is ${l.code} but 200 expected`));
    //   throw new Error('Dead links found');
    // }
  }

  function tick() {
    currentPromise = checkForBadLinks()
      .catch((err) => {
        log.error(`Failure checking for bad links ${err.messsage}`);
      })
      .finally(() => {
        currentTimer = setTimeout(tick, 1000);
      });
  }

  lifeCycle.beforeTests.add(() => {
    // start checking links at the beginning of tests
    tick();
  });

  lifeCycle.cleanup.add(async () => {
    await currentPromise;
    if (currentTimer) {
      clearTimeout(currentTimer);
    }
    if (badLinks.length) {
      return;
    }
    log.error(`${badLinks.length} bad links: ${badLinks.join('\n')} `);
    throw new Error('bad links were found');
  });
}
