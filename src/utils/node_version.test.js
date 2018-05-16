import { NodeVersion } from './node_version';

const OLD_PROCESS_VERSION = process.version;
const NODE_JS_VERSION = '8.12.0';

const defineProcessVersion = (version, writable = true) => {
  Object.defineProperty(process, 'version', { value: version, writable });
};

jest.mock('./index', () => ({
  pkg: {
    engines: {
      node: '8.12.0'
    }
  }
}));

describe('NodeVersion', () => {
  beforeEach(() => {
    defineProcessVersion(NODE_JS_VERSION);
  });

  afterEach(() => {
    defineProcessVersion(OLD_PROCESS_VERSION, false);
  });

  it('should return the current NodeJS version', () => {
    expect(NodeVersion.getCurrentVersion()).toBe(NODE_JS_VERSION);

    defineProcessVersion(`v${NODE_JS_VERSION}`);
    expect(NodeVersion.getCurrentVersion()).toBe(NODE_JS_VERSION);

    defineProcessVersion('a.b.c');
    expect(NodeVersion.getCurrentVersion()).toBeNull();
  });

  it('should return the required NodeJS version', () => {
    expect(NodeVersion.getRequiredVersion()).toBe(NODE_JS_VERSION);
  });

  it('should validate current version', () => {
    expect(NodeVersion.isVersionValid(NODE_JS_VERSION, NODE_JS_VERSION)).toBeTruthy();
    expect(NodeVersion.isVersionValid('9.0.0', `>${NODE_JS_VERSION}`)).toBeTruthy();
    expect(NodeVersion.isVersionValid('8.13.0', `^${NODE_JS_VERSION}`)).toBeTruthy();
    expect(NodeVersion.isVersionValid('8.12.5', `~${NODE_JS_VERSION}`)).toBeTruthy();
  });

  it('should not validate current version', () => {
    expect(NodeVersion.isVersionValid('1.0.0', NODE_JS_VERSION)).toBeFalsy();
    expect(NodeVersion.isVersionValid('8.0.0', `>${NODE_JS_VERSION}`)).toBeFalsy();
  });

  it('should run validator when version is valid and run condition = valid', () => {
    const validatorCb = jest.fn();
    jest.spyOn(NodeVersion, 'isVersionValid').mockReturnValue(true);

    NodeVersion.runValidator(validatorCb, true);
    expect(validatorCb).toHaveBeenCalled();

    NodeVersion.isVersionValid.mockRestore();
  });

  it('should run validator when version is invalid and run condition = invalid', () => {
    const validatorCb = jest.fn();
    jest.spyOn(NodeVersion, 'isVersionValid').mockReturnValue(false);

    NodeVersion.runValidator(validatorCb);
    expect(validatorCb).toHaveBeenCalled();

    NodeVersion.isVersionValid.mockRestore();
  });

  it('should not run validator when version is valid and run condition = invalid', () => {
    const validatorCb = jest.fn();
    jest.spyOn(NodeVersion, 'isVersionValid').mockReturnValue(true);

    NodeVersion.runValidator(validatorCb);
    expect(validatorCb).not.toHaveBeenCalled();

    NodeVersion.isVersionValid.mockRestore();
  });

  it('should not run validator when version is invalid and run condition = valid', () => {
    const validatorCb = jest.fn();
    jest.spyOn(NodeVersion, 'isVersionValid').mockReturnValue(false);

    NodeVersion.runValidator(validatorCb, true);
    expect(validatorCb).not.toHaveBeenCalled();

    NodeVersion.isVersionValid.mockRestore();
  });
});
