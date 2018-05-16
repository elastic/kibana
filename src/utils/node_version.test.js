import { NodeVersion } from './index';

const OLD_PROCESS_VERSION = process.version;
const NODE_JS_VERSION = '8.12.0';

jest.mock('./index', () => ({
  pkg: {
    engines: {
      node: NODE_JS_VERSION
    }
  }
}));

describe('NodeVersion', () => {

  jest.beforeAll(() => {
    process.version = NODE_JS_VERSION;
  });

  jest.afterAll(() => {
    process.version = OLD_PROCESS_VERSION;
  });

  it('should return the current NodeJS version', async () => {
    expect(NodeVersion.getCurrentVersion()).toBe(NODE_JS_VERSION);
  });
});
