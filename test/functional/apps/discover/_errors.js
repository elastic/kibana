import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('errors', function describeIndexTests() {
    before(async function () {
      await esArchiver.load('invalid_scripted_field');
      await PageObjects.common.navigateToApp('discover');
    });

    after(async function () {
      await esArchiver.unload('invalid_scripted_field');
    });

    describe('invalid scripted field error', () => {
      it('is rendered', async () => {
        const isFetchErrorVisible = await testSubjects.exists(
          'discoverFetchError'
        );
        expect(isFetchErrorVisible).to.be(true);
      });
    });
  });
}
