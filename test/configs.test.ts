import {
  getCombinedConfig,
  getGlobalConfig,
  getProjectConfig,
  maybeCreateGlobalConfig
} from '../src/lib/configs';
import * as rpc from '../src/lib/rpc';
import findUp from 'find-up';
import {
  validateProjectConfig,
  validateGlobalConfig
} from '../src/lib/schemas';
import {
  CombinedConfig,
  ProjectConfig,
  GlobalConfig
} from '../src/types/types';

describe('config.js', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('getProjectConfig', () => {
    describe('when projectConfig is valid', () => {
      let projectConfig: ProjectConfig | null;
      beforeEach(async () => {
        jest
          .spyOn(rpc, 'readFile')
          .mockResolvedValue(
            JSON.stringify({ upstream: 'elastic/kibana', branches: ['6.x'] })
          );

        projectConfig = await getProjectConfig();
      });

      it('should call findUp', () => {
        expect(findUp).toHaveBeenCalledWith('.backportrc.json');
      });

      it('should return config', () => {
        expect(projectConfig).toEqual({
          branchChoices: [{ checked: false, name: '6.x' }],
          upstream: 'elastic/kibana'
        });
      });
    });

    describe('when projectConfig is empty', () => {
      it('should throw error', () => {
        jest.spyOn(rpc, 'readFile').mockResolvedValueOnce('{}');
        expect.assertions(1);

        return getProjectConfig().catch(e => {
          expect(e.message).toContain(
            'The project config file (/path/to/project/config) is not valid'
          );
        });
      });
    });

    describe('when projectConfig is missing', () => {
      it('should return null', () => {
        (findUp as any).__setMockPath();
        expect.assertions(1);
        return expect(getProjectConfig()).resolves.toBe(null);
      });
    });
  });

  describe('getGlobalConfig', () => {
    let res: GlobalConfig;
    beforeEach(async () => {
      jest.spyOn(rpc, 'chmod').mockResolvedValue(null);
      jest.spyOn(rpc, 'mkdirp').mockResolvedValue(null);
      jest.spyOn(rpc, 'writeFile').mockResolvedValue(null);
      jest.spyOn(rpc, 'statSync').mockReturnValue({ mode: 33152 });
      jest.spyOn(rpc, 'readFile').mockResolvedValue(
        JSON.stringify({
          accessToken: 'myAccessToken',
          username: 'sqren'
        })
      );
      res = await getGlobalConfig();
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
        expect.stringContaining('/templates/configTemplate.json'),
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
      jest.spyOn(rpc, 'writeFile').mockResolvedValue(undefined);
      await maybeCreateGlobalConfig(
        '/path/to/globalConfig',
        'myConfigTemplate'
      );

      expect(rpc.writeFile).toHaveBeenCalledWith(
        '/path/to/globalConfig',
        expect.stringContaining('myConfigTemplate'),
        { flag: 'wx', mode: 384 }
      );
    });

    it('should not fail if config already exists', async () => {
      const err = new Error();
      (err as any).code = 'EEXIST';
      jest.spyOn(rpc, 'writeFile').mockRejectedValueOnce(err);

      expect(
        await maybeCreateGlobalConfig('myPath', 'myConfigTemplate')
      ).toEqual(undefined);
    });
  });

  describe('getCombinedConfig', () => {
    let res: CombinedConfig;

    beforeEach(async () => {
      jest.spyOn(rpc, 'readFile').mockImplementation((filepath: string) => {
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
      res = await getCombinedConfig();
    });

    it('should return correct config', () => {
      expect(res).toEqual({
        accessToken: 'myAccessToken',
        all: false,
        branchChoices: [
          { checked: false, name: '6.x' },
          { checked: false, name: '6.1' }
        ],
        labels: [],
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
        validateProjectConfig({ upstream: 1337 }, '/path/to/.backportrc.json')
      ).toThrowErrorMatchingSnapshot();
    });

    it('should return valid config', () => {
      const config = { upstream: 'elastic/kibana', branches: ['6.1', '6.x'] };
      expect(validateProjectConfig(config, '/path/to/.backportrc.json')).toBe(
        config
      );
    });
  });

  describe('validateGlobalConfig', () => {
    beforeEach(() => {
      jest.spyOn(rpc, 'statSync').mockReturnValue({ mode: 33152 });
    });

    it('should fail if config is invalid', () => {
      expect(() =>
        validateGlobalConfig(
          ({
            username: 1337
          } as any) as GlobalConfig,
          '/path/to/.backport/config.json'
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('should return valid config', () => {
      const config = { username: 'sqren', accessToken: 'myAccessToken' };
      expect(
        validateGlobalConfig(config, '/path/to/.backport/config.json')
      ).toBe(config);
    });
  });
});
