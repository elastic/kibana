// Mock the following dependencies globally (in all tests)

jest.mock('os', () => {
  return {
    homedir: () => '/myHomeDir'
  };
});

jest.mock('../src/lib/logger', () => {
  return {
    log: () => {},
    error: () => {}
  };
});

jest.mock('ora', () => {
  return () => {
    return {
      start: () => ({
        succeed: () => {},
        stop: () => {},
        fail: () => {},
        stopAndPersist: () => {}
      })
    };
  };
});
