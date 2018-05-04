describe('Console App', function () {

  beforeEach(function () {
    browser.url('/');
  });

  it('Basic Table', function () {
    browser.waitForExist('#a-simple-basictable');
    const results = browser.checkElement('#a-simple-basictable .euiBasicTable');
    expectImageToBeSame (results);
  });

});
