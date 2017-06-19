import { delay } from 'bluebird';
import Command from 'leadfoot/Command';
import Server from 'leadfoot/Server';

import { initVerboseRemoteLogging } from './verbose_remote_logging';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

let attemptCounter = 0;
async function attemptToCreateCommand(log, server, chromedriverApi) {
  const attemptId = ++attemptCounter;

  log.debug('[leadfoot:command] Creating session');
  const session = await server.createSession({ browserName: 'chrome' });
  if (attemptId !== attemptCounter) return; // abort

  log.debug('[leadfoot:command] Registerying session for teardown');
  chromedriverApi.beforeStop(async () => session.quit());
  if (attemptId !== attemptCounter) return; // abort

  log.debug('[leadfoot:command] Completing session capabilities');
  await server._fillCapabilities(session);
  if (attemptId !== attemptCounter) return; // abort

  // command looks like a promise beacuse it has a `.then()` function
  // so we wrap it in an object to prevent async/await from trying to
  // unwrap/resolve it
  return { command: new Command(session) };
}

export async function initLeadfootCommand({ log, chromedriverApi }) {
  return await Promise.race([
    (async () => {
      await delay(2 * MINUTE);
      throw new Error('remote failed to start within 2 minutes');
    })(),

    (async () => {
      // a `leadfoot/Server` object knows how to communicate with the webdriver
      // backend (chromedriver in this case). it helps with session management
      // and all communication to the remote browser go through it, so we shim
      // some of it's methods to enable very verbose logging.
      const server = initVerboseRemoteLogging(log, new Server(chromedriverApi.getUrl()));

      // by default, calling server.createSession() automatically fixes the webdriver
      // "capabilities" hash so that leadfoot knows the hoops it has to jump through
      // to have feature compliance. This is sort of like building "$.support" in jQuery.
      // Unfortunately this process takes a couple seconds, so if we let leadfoot
      // do it and we have an error, are killed, or for any other reason have to
      // teardown we won't have a session object until the auto-fixing is complete.
      //
      // To avoid this we disable auto-fixing with this flag and call
      // `server._fillCapabilities()` ourselves to do the fixing once we have a reference
      // to the session and have registered it for teardown before stopping the
      // chromedriverApi.
      server.fixSessionCapabilities = false;

      while (true) {
        const command = await Promise.race([
          delay(30 * SECOND),
          attemptToCreateCommand(log, server, chromedriverApi)
        ]);

        if (!command) {
          continue;
        }

        return command;
      }
    })()
  ]);
}
