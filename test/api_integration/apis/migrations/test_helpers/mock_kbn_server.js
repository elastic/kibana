export function mockKbnServer(callWithInternalUser, version = '9.8.7') {
  return {
    version,
    server: {
      plugins: {
        elasticsearch: {
          getCluster(name) {
            if (name !== 'admin') {
              throw new Error(`Expected cluster to be admin, but got "${name}".`);
            }
            return {
              callWithInternalUser,
            };
          },
        },
      },
      log: () => {},
    },
  };
}
