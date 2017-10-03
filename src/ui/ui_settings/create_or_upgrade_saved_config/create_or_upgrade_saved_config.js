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
  const upgradeable = await getUpgradeableConfig({
    savedObjectsClient,
    version
  });

  if (upgradeable) {
    log(['plugin', 'elasticsearch'], {
      tmpl: 'Upgrade config from <%= prevVersion %> to <%= newVersion %>',
      prevVersion: upgradeable.id,
      newVersion: version
    });
  }

  // default to the attributes of the upgradeable config if available
  const attributes = defaults(
    { buildNum },
    upgradeable ? upgradeable.attributes : {}
  );

  // create the new SavedConfig
  await savedObjectsClient.create(
    'config',
    attributes,
    { id: version }
  );
}
