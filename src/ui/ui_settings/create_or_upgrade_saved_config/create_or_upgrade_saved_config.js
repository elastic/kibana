import { getUpgradeableConfig } from './get_upgradeable_config';

export async function createOrUpgradeSavedConfig(options) {
  const {
    savedObjectsClient,
    version,
    buildNum,
    log,
  } = options;

  // next, try to upgrade an older config
  const upgradeable = await getUpgradeableConfig({ savedObjectsClient, version });
  if (upgradeable) {
    log(['plugin', 'elasticsearch'], {
      tmpl: 'Upgrade config from <%= prevVersion %> to <%= newVersion %>',
      prevVersion: upgradeable.id,
      newVersion: version
    });

    await savedObjectsClient.create(
      'config',
      {
        ...upgradeable.attributes,
        buildNum
      },
      { id: version }
    );

    return;
  }

  // if all else fails, create a new SavedConfig
  await savedObjectsClient.create(
    'config',
    { buildNum },
    { id: version }
  );
}
