import { defaults } from 'lodash';

import { getUpgradeableConfig } from './get_upgradeable_config';

export async function createOrUpgradeSavedConfig(options) {
  const {
    savedObjectsClient,
    version,
    buildNum,
    log,
  } = options;

  // try to find an older config we can upgrade
  const upgradeableConfig = await getUpgradeableConfig({
    savedObjectsClient,
    version
  });

  if (upgradeableConfig) {
    log(['plugin', 'elasticsearch'], {
      tmpl: 'Upgrade config from <%= prevVersion %> to <%= newVersion %>',
      prevVersion: upgradeableConfig.id,
      newVersion: version
    });
  }

  // default to the attributes of the upgradeableConfig if available
  const attributes = defaults(
    { buildNum },
    upgradeableConfig ? upgradeableConfig.attributes : {}
  );

  // create the new SavedConfig
  await savedObjectsClient.create(
    'config',
    attributes,
    { id: version }
  );
}
