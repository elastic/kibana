import * as rpc from '../../../src/services/rpc';
import {
  getGlobalConfig,
  maybeCreateGlobalConfig
} from '../../../src/options/config/globalConfig';
import { PromiseReturnType } from '../../../src/types/commons';

describe('config', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('getGlobalConfig', () => {
    let res: PromiseReturnType<typeof getGlobalConfig>;
    beforeEach(async () => {
      jest.spyOn(rpc, 'chmod').mockResolvedValue();
      jest.spyOn(rpc, 'mkdirp').mockResolvedValue();
      jest.spyOn(rpc, 'writeFile').mockResolvedValue();
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
        expect.any(String),
        { flag: 'wx', mode: 384 }
      );
    });

    it("should create config folders if it they don't exist", () => {
      expect(rpc.mkdirp).toHaveBeenCalledWith(
        '/myHomeDir/.backport/repositories'
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
      const didCreate = await maybeCreateGlobalConfig(
        '/path/to/globalConfig',
        'myConfigTemplate'
      );

      expect(didCreate).toEqual(true);

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

      const didCreate = await maybeCreateGlobalConfig(
        'myPath',
        'myConfigTemplate'
      );

      expect(didCreate).toEqual(false);
    });
  });
});
