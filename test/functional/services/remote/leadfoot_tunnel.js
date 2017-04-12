import SeleniumTunnel from 'digdug/SeleniumTunnel';
import uuid from 'node-uuid';

// intern.Runner#loadTunnel
export async function createTunnel({ log, tunnelConfig }) {
  const tunnel = new SeleniumTunnel({
    // https://git.io/vDnfv
    ...tunnelConfig,
    drivers: ['chrome'],
    tunnelId: uuid.v4()
  });

  // override https://git.io/vDnfe so shutdown is fast
  tunnel._stop = async () => {
    const proc = tunnel._process;

    if (!proc) {
      log.error('Update to stop tunnel, child process not found');
      return;
    }

    const exitted = new Promise(resolve => proc.on('exit', resolve));
    tunnel._process.kill('SIGTERM');
    await exitted;
  };

  await tunnel.start();
  return tunnel;
}
