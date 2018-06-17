const configs = require('../src/lib/configs');
const rpc = require('../src/lib/rpc');
const findUp = require('find-up');

describe('config.js', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('getProjectConfig', () => {
    describe('when projectConfig is valid', () => {
      let projectConfig;
      beforeEach(async () => {
        jest
          .spyOn(rpc, 'readFile')
          .mockResolvedValue(
            JSON.stringify({ upstream: 'elastic/kibana', branches: ['6.x'] })
          );

        projectConfig = await configs.getProjectConfig();
      });

      it('should call findUp', () => {
        expect(findUp).toHaveBeenCalledWith('.backportrc.json');
      });

      it('should return config', () => {
        expect(projectConfig).toEqual({
          upstream: 'elastic/kibana',
          branches: ['6.x']
        });
      });
    });

    describe('when projectConfig is empty', () => {
      it('should throw error', () => {
        jest.spyOn(rpc, 'readFile').mockResolvedValueOnce('{}');
        expect.assertions(1);

        return configs.getProjectConfig().catch(e => {
          expect(e.message).toContain(
            'The project config file (/path/to/project/config) is not valid'
          );
        });
      });
    });

    describe('when projectConfig is missing', () => {
      it('should return null', () => {
        findUp.__setMockPath();
        expect.assertions(1);
        return expect(configs.getProjectConfig()).resolves.toBe(null);
      });
    });
  });

  describe('getGlobalConfig', () => {
    let res;
    beforeEach(async () => {
      jest.spyOn(rpc, 'chmod').mockResolvedValue();
      jest.spyOn(rpc, 'mkdirp').mockResolvedValue();
      jest.spyOn(rpc, 'writeFile').mockResolvedValue();
      jest.spyOn(rpc, 'statSync').mockReturnValue({ mode: 33152 });
      jest.spyOn(rpc, 'readFile').mockResolvedValue(
        JSON.stringify({
          accessToken: 'myAccessToken',
          username: 'sqren'
        })
      );
      res = await configs.getGlobalConfig();
    });

    it("should create config if it doesn't exist", () => {
      expect(rpc.writeFile).toHaveBeenCalledWith(
        '/myHomeDir/.backport/config.json',
        '{"accessToken":"myAccessToken","username":"sqren"}',
        { flag: 'wx', mode: 384 }
      );
    });

    it("should create config folders if it they don't exist", () => {
      expect(rpc.mkdirp).toHaveBeenCalledWith(
        '/myHomeDir/.backport/repositories'
      );
    });

    it('should load configTemplate', () => {
      expect(rpc.readFile).toHaveBeenCalledWith(
        expect.stringContaining('/src/lib/configTemplate.json'),
        'utf8'
      );
    });

    it('should load config', () => {
      expect(rpc.readFile).toHaveBeenCalledWith(
        '/myHomeDir/.backport/config.json',
        'utf8'
      );
    });

    it('should return config', () => {
      expect(res).toEqual({
        accessToken: 'myAccessToken',
        username: 'sqren'
      });
    });
  });

  describe('maybeCreateGlobalConfig', () => {
    it('should create config and succeed', async () => {
      jest.spyOn(rpc, 'writeFile').mockResolvedValue();
      await configs.maybeCreateGlobalConfig(
        '/path/to/globalConfig',
        'myConfigTemplate'
      );

      expect(rpc.writeFile).toHaveBeenCalledWith(
        '/path/to/globalConfig',
        expect.stringContaining('myConfigTemplate'),
        { flag: 'wx', mode: 384 }
      );
    });

    it('should not fail if config already exists', () => {
      const err = new Error();
      err.code = 'EEXIST';
      jest
        .spyOn(rpc, 'writeFile')
        .mockImplementationOnce(() => Promise.reject(err));

      return configs.maybeCreateGlobalConfig();
    });
  });

  describe('getCombinedConfig', () => {
    let res;

    beforeEach(async () => {
      jest.spyOn(rpc, 'readFile').mockImplementation(filepath => {
        if (filepath.includes('/configTemplate.json')) {
          return 'myConfigTemplate';
        } else if (filepath === '/path/to/project/config') {
          return JSON.stringify({
            upstream: 'elastic/kibana',
            branches: ['6.x', '6.1']
          });
        } else if (filepath === '/myHomeDir/.backport/config.json') {
          return JSON.stringify({
            username: 'sqren',
            accessToken: 'myAccessToken'
          });
        }
      });
      res = await configs.getCombinedConfig();
    });

    it('should return correct config', () => {
      expect(res).toEqual({
        accessToken: 'myAccessToken',
        all: false,
        branches: ['6.x', '6.1'],
        multiple: false,
        multipleBranches: true,
        multipleCommits: false,
        upstream: 'elastic/kibana',
        username: 'sqren'
      });
    });
  });

  describe('validateProjectConfig', () => {
    it('should fail if config is invalid', () => {
      expect(() =>
        configs.validateProjectConfig(
          { upstream: 1337 },
          '/path/to/.backportrc.json'
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('should return valid config', () => {
      const config = { upstream: 'elastic/kibana', branches: ['6.1', '6.x'] };
      expect(
        configs.validateProjectConfig(config, '/path/to/.backportrc.json')
      ).toBe(config);
    });
  });

  describe('validateGlobalConfig', () => {
    beforeEach(() => {
      jest.spyOn(rpc, 'statSync').mockReturnValue({ mode: 33152 });
    });

    it('should fail if config is invalid', () => {
      expect(() =>
        configs.validateGlobalConfig(
          { username: 1337 },
          '/path/to/.backport/config.json'
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('should return valid config', () => {
      const config = { username: 'sqren', accessToken: 'myAccessToken' };
      expect(
        configs.validateGlobalConfig(config, '/path/to/.backport/config.json')
      ).toBe(config);
    });
  });
});
