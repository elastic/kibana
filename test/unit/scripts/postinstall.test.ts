import * as globalConfig from '../../../src/options/config/globalConfig';
import { postinstall } from '../../../src/scripts/postinstall';

describe('postinstall', () => {
  it("should create global config if it doesn't exist", async () => {
    const consoleSpy = spyOn(console, 'log');
    const spy = spyOn(
      globalConfig,
      'maybeCreateGlobalConfigAndFolder'
    ).and.returnValue(true);

    await postinstall();
    expect(spy).toBeCalledTimes(1);
    expect(consoleSpy).toBeCalledWith(
      'Global config successfully created in /myHomeDir/.backport/config.json'
    );
  });

  it('should not create global config if it already exists', async () => {
    const consoleSpy = spyOn(console, 'log');
    const spy = spyOn(
      globalConfig,
      'maybeCreateGlobalConfigAndFolder'
    ).and.returnValue(false);

    await postinstall();
    expect(spy).toBeCalledTimes(1);
    expect(consoleSpy).toBeCalledTimes(0);
  });
});
