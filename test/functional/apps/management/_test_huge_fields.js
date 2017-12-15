import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'home', 'settings']);

  describe('test large number of fields', function () {
    const EXPECTED_FIELD_COUNT = 2259;
    before(async function () {
      await esArchiver.loadIfNeeded('large_fields');
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.createIndexPattern('testhuge');
    });

    it('test_huge data should have expected number of fields', function () {
      return retry.try(function () {
        return PageObjects.settings.getFieldsTabCount()
          .then(function (tabCount) {
            expect(tabCount).to.be('' + EXPECTED_FIELD_COUNT);
          });
      });
    });


  });
}
