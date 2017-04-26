import { delay } from 'bluebird';
import Command from 'leadfoot/Command';

import { createTunnel } from './leadfoot_tunnel';
import { createSession } from './leadfoot_session';

const MINUTE = 1000 * 60;

export async function initLeadfootCommand({ log, tunnelConfig, lifecycle }) {
  return await Promise.race([
    (async () => {
      await delay(2 * MINUTE);
      throw new Error('remote failed to start within 2 minutes');
    })(),

    (async () => {
      const tunnel = await createTunnel({ log, tunnelConfig, lifecycle });
      const session = await createSession({ log, tunnel });

      const command = new Command(session);

      lifecycle.on('cleanup', async () => {
        log.verbose('remote: closing leadfoot remote');
        await command.quit();

        log.verbose('remote: closing digdug tunnel');
        await tunnel.stop();
      });

      log.verbose('remote: created leadfoot command');
      tunnel.on('stdout', chunk => log.verbose('Tunnel [stdout]:', chunk.toString('utf8').trim()));
      tunnel.on('stderr', chunk => log.verbose('Tunnel [stderr]:', chunk.toString('utf8').trim()));

      // command looks like a promise beacuse it has a then function
      // so we wrap it in an object to prevent our promise from trying to unwrap/resolve
      // the remote
      return { command };
    })()
  ]);
}
