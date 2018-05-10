import HomePage from '../../page_objects/home/home_page';
import { stripRequest } from '../../helpers/helpers';

describe('Console App', function () {

  beforeEach(function () {
    this.driver = browser;
    this.driver.url('/');
    this.homePage = new HomePage(this.driver);
    this.consolePage = this.homePage.sideNav.navigateToApp('Console');
  });

  it('should show the default request', function () {
    //Remove all spaces and new line characters to ensure that the content is the same.
    const requestData =  stripRequest(this.consolePage.request);
    const defaultRequestData = stripRequest(this.consolePage.DEFAULT_REQUEST);
    expect(requestData).to.equal(defaultRequestData);

  });

  it('default request response should include `"timed_out": false`', function () {
    const expectedResponseContains = '"timed_out": false,';
    this.consolePage.clickPlay();

    const actualResponse = this.consolePage.response;
    expect(actualResponse).to.contain(expectedResponseContains);

  });

  it('settings should allow changing the text size', function () {
    const beginningFontSize = this.consolePage.requestFontSize;

    this.consolePage.changeFontSize(20);
    expect(this.consolePage.requestFontSize).not.to.equal(beginningFontSize);
    expect(this.consolePage.requestFontSize).to.equal('20px');


    this.consolePage.changeFontSize(24);
    expect(this.consolePage.requestFontSize).not.to.equal('20px');
    expect(this.consolePage.requestFontSize).to.equal('24px');

  });
});
