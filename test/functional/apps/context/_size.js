import { expect } from 'chai';

import { bdd, esClient } from '../../../support';
import PageObjects from '../../../support/page_objects';


bdd.describe('context size', function contextSize() {
  bdd.it('should respect the default context size setting', async function () {
    await esClient.updateConfigDoc({ 'context:defaultSize': '7' });
    await PageObjects.context.navigateTo('logstash-*', 'apache', 'AU_x3_BrGFA8no6QjjaI');

    console.log(await PageObjects.context.remote.getCurrentUrl());
    expect(await PageObjects.context.getDocTableHeaderTexts()).to.have.members([
      '',
      'Time',
      '@message',
    ]);
  });
});
