// Mock logger and ora (spinner) globally in all tests

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
