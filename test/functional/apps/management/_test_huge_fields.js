import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'home', 'settings']);

  describe('test large number of fields @skipcloud', function () {
    const EXPECTED_FIELD_COUNT = '10006';
    before(async function () {
      await esArchiver.loadIfNeeded('large_fields');
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.createIndexPattern('testhuge', 'date');
    });

    it('test_huge data should have expected number of fields', async function () {
      const tabCount = await PageObjects.settings.getFieldsTabCount();
      expect(tabCount).to.be(EXPECTED_FIELD_COUNT);
    });

    after(async () => {
      await esArchiver.unload('large_fields');
    });

  });
}
