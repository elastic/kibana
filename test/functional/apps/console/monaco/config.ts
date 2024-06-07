
import { FtrConfigProviderContext } from '@kbn/test';
import { configureHTTP2 } from '../../../../common/configure_http2';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../../config.base.js'));

  return configureHTTP2({
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
  });
}
