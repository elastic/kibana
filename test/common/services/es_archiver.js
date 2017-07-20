import { EsArchiver } from '../../../src/es_archiver';

export async function EsArchiverProvider({ getService }) {
  const config = getService('config');
  const client = getService('es');
  const log = getService('log');

  if (!config.get('esArchiver')) {
    throw new Error(`esArchiver can't be used unless you specify it's config in your config file`);
  }

  const dataDir = config.get('esArchiver.directory');

  return new EsArchiver({
    client,
    dataDir,
    log,
  });
}
