import sinon from 'sinon';
import expect from 'expect.js';

import { createEsTestCluster } from '@kbn/test';
import { createServerWithCorePlugins } from '../../../../test_utils/kbn_server';
import { createToolingLog } from '../../../../dev';
import { createOrUpgradeSavedConfig } from '../create_or_upgrade_saved_config';

describe('createOrUpgradeSavedConfig()', () => {
  let savedObjectsClient;
  let kbnServer;
  const cleanup = [];

  before(async function () {
    const log = createToolingLog('debug');
    log.pipe(process.stdout);
    log.indent(6);

    log.info('starting elasticsearch');
    log.indent(4);

    const es = createEsTestCluster({ log });
    this.timeout(es.getStartTimeout());

    log.indent(-4);
    cleanup.push(async () => await es.cleanup());

    await es.start();

    kbnServer = createServerWithCorePlugins();
    await kbnServer.ready();
    cleanup.push(async () => {
      await kbnServer.close();
      kbnServer = null;
      savedObjectsClient = null;
    });

    await kbnServer.server.plugins.elasticsearch.waitUntilReady();

    savedObjectsClient = kbnServer.server.savedObjectsClientFactory({
      callCluster: es.getCallCluster(),
    });

    await savedObjectsClient.bulkCreate([
      {
        id: '5.4.0-SNAPSHOT',
        type: 'config',
        attributes: {
          buildNum: 54090,
          '5.4.0-SNAPSHOT': true,
        },
      },
      {
        id: '5.4.0-rc1',
        type: 'config',
        attributes: {
          buildNum: 54010,
          '5.4.0-rc1': true,
        },
      },
      {
        id: '@@version',
        type: 'config',
        attributes: {
          buildNum: 99999,
          '@@version': true,
        },
      },
    ]);
  });

  after(async () => {
    await Promise.all(cleanup.map(fn => fn()));
    cleanup.length = 0;
  });

  it('upgrades the previous version on each increment', async function () {
    this.timeout(30000);

    // ------------------------------------
    // upgrade to 5.4.0
    await createOrUpgradeSavedConfig({
      savedObjectsClient,
      version: '5.4.0',
      buildNum: 54099,
      log: sinon.stub(),
    });

    const config540 = await savedObjectsClient.get('config', '5.4.0');
    expect(config540)
      .to.have.property('attributes')
      .eql({
        // should have the new build number
        buildNum: 54099,

        // 5.4.0-SNAPSHOT and @@version were ignored so we only have the
        // attributes from 5.4.0-rc1, even though the other build nums are greater
        '5.4.0-rc1': true,
      });

    // add the 5.4.0 flag to the 5.4.0 savedConfig
    await savedObjectsClient.update('config', '5.4.0', {
      '5.4.0': true,
    });

    // ------------------------------------
    // upgrade to 5.4.1
    await createOrUpgradeSavedConfig({
      savedObjectsClient,
      version: '5.4.1',
      buildNum: 54199,
      log: sinon.stub(),
    });

    const config541 = await savedObjectsClient.get('config', '5.4.1');
    expect(config541)
      .to.have.property('attributes')
      .eql({
        // should have the new build number
        buildNum: 54199,

        // should also include properties from 5.4.0 and 5.4.0-rc1
        '5.4.0': true,
        '5.4.0-rc1': true,
      });

    // add the 5.4.1 flag to the 5.4.1 savedConfig
    await savedObjectsClient.update('config', '5.4.1', {
      '5.4.1': true,
    });

    // ------------------------------------
    // upgrade to 7.0.0-rc1
    await createOrUpgradeSavedConfig({
      savedObjectsClient,
      version: '7.0.0-rc1',
      buildNum: 70010,
      log: sinon.stub(),
    });

    const config700rc1 = await savedObjectsClient.get('config', '7.0.0-rc1');
    expect(config700rc1)
      .to.have.property('attributes')
      .eql({
        // should have the new build number
        buildNum: 70010,

        // should also include properties from 5.4.1, 5.4.0 and 5.4.0-rc1
        '5.4.1': true,
        '5.4.0': true,
        '5.4.0-rc1': true,
      });

    // tag the 7.0.0-rc1 doc
    await savedObjectsClient.update('config', '7.0.0-rc1', {
      '7.0.0-rc1': true,
    });

    // ------------------------------------
    // upgrade to 7.0.0
    await createOrUpgradeSavedConfig({
      savedObjectsClient,
      version: '7.0.0',
      buildNum: 70099,
      log: sinon.stub(),
    });

    const config700 = await savedObjectsClient.get('config', '7.0.0');
    expect(config700)
      .to.have.property('attributes')
      .eql({
        // should have the new build number
        buildNum: 70099,

        // should also include properties from ancestors, including 7.0.0-rc1
        '7.0.0-rc1': true,
        '5.4.1': true,
        '5.4.0': true,
        '5.4.0-rc1': true,
      });

    // tag the 7.0.0 doc
    await savedObjectsClient.update('config', '7.0.0', {
      '7.0.0': true,
    });

    // ------------------------------------
    // "downgrade" to 6.2.3-rc1
    await createOrUpgradeSavedConfig({
      savedObjectsClient,
      version: '6.2.3-rc1',
      buildNum: 62310,
      log: sinon.stub(),
    });

    const config623rc1 = await savedObjectsClient.get('config', '6.2.3-rc1');
    expect(config623rc1)
      .to.have.property('attributes')
      .eql({
        // should have the new build number
        buildNum: 62310,

        // should also include properties from ancestors, but not 7.0.0-rc1 or 7.0.0
        '5.4.1': true,
        '5.4.0': true,
        '5.4.0-rc1': true,
      });
  });
});
