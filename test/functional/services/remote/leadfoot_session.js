import Server from 'leadfoot/Server';

// intern.Runner#loadTestModules
//   intern.Runner#_createSuites
export async function createSession({ log, tunnel }) {
  const server = new Server(tunnel.clientUrl);
  log.verbose('remote: created leadfoot server');

  const session = await server.createSession({
    browserName: 'chrome'
  });

  log.verbose('remote: created leadfoot session');

  return session;
}
