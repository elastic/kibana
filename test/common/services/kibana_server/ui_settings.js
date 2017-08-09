import { createCallCluster } from '../../../../src/test_utils/es';
import { SavedObjectsClient } from '../../../../src/server/saved_objects';

export class KibanaServerUiSettings {
  constructor(log, es, kibanaIndex, kibanaVersion) {
    this._log = log;
    this._kibanaVersion = kibanaVersion;
    this._savedObjectsClient = new SavedObjectsClient(
      kibanaIndex.getName(),
      kibanaIndex.getMappingsDsl(),
      createCallCluster(es)
    );
  }

  async _id() {
    return await this._kibanaVersion.get();
  }

  async existInEs() {
    return !!(await this._read());
  }

  /*
  ** Gets defaultIndex from the config doc.
  */
  async getDefaultIndex() {
    const doc = await this._read();
    if (!doc) {
      throw new TypeError('Failed to fetch kibana config doc');
    }
    const defaultIndex = doc.attributes.defaultIndex;
    this._log.verbose('uiSettings.defaultIndex: %j', defaultIndex);
    return defaultIndex;
  }

  /**
   *  Sets the auto-hide timeout to 1 hour so that auto-hide is
   *  effectively disabled. This gives the tests more time to
   *  interact with the notifications without having to worry about
   *  them disappearing if the tests are too slow.
   *
   *  @return {Promise<undefined>}
   */
  async disableToastAutohide() {
    await this.update({
      'notifications:lifetime:banner': 360000,
      'notifications:lifetime:error': 360000,
      'notifications:lifetime:warning': 360000,
      'notifications:lifetime:info': 360000,
    });
  }

  async replace(doc) {
    this._log.debug('replacing kibana config doc: %j', doc);
    await this._savedObjectsClient.create('config', doc, {
      id: await this._id(),
      overwrite: true,
    });
  }

  /**
  * Add fields to the config doc (like setting timezone and defaultIndex)
  * @return {Promise} A promise that is resolved when elasticsearch has a response
  */
  async update(updates) {
    this._log.debug('applying update to kibana config: %j', updates);
    await this._savedObjectsClient.update('config', await this._id(), updates);
  }

  async _read() {
    try {
      const doc = await this._savedObjectsClient.get('config', await this._id());
      this._log.verbose('Fetched kibana config doc', doc);
      return doc;
    } catch (err) {
      this._log.debug('Failed to fetch kibana config doc', err.message);
      return;
    }
  }
}
