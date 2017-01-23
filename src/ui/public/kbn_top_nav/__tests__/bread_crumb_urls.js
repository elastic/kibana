import expect from 'expect.js';

import { getBreadCrumbUrls } from '../bread_crumbs/bread_crumb_url';

describe('getBreadCrumbUrls', function () {

  it('returns urls for the breadcrumbs', function () {
    const breadCrumbUrls = getBreadCrumbUrls(
      ['path1', 'path2', 'a', 'longlonglonglong'],
      'http://test.com/path1/path2/a/longlonglonglong');
    expect(breadCrumbUrls.length).to.equal(4);
    expect(breadCrumbUrls[0].url).to.equal('http://test.com/path1');
    expect(breadCrumbUrls[0].breadcrumb).to.equal('path1');

    expect(breadCrumbUrls[1].url).to.equal('http://test.com/path1/path2');
    expect(breadCrumbUrls[1].breadcrumb).to.equal('path2');

    expect(breadCrumbUrls[2].url).to.equal('http://test.com/path1/path2/a');
    expect(breadCrumbUrls[2].breadcrumb).to.equal('a');

    expect(breadCrumbUrls[3].url).to.equal('http://test.com/path1/path2/a/longlonglonglong');
    expect(breadCrumbUrls[3].breadcrumb).to.equal('longlonglonglong');
  });

  it('is case insensitive', function () {
    const breadCrumbUrls = getBreadCrumbUrls(['Path1', 'Path2'], 'http://TEST.com/paTh1/path2');
    expect(breadCrumbUrls.length).to.equal(2);
    expect(breadCrumbUrls[0].url).to.equal('http://TEST.com/paTh1');
    expect(breadCrumbUrls[0].breadcrumb).to.equal('Path1');

    expect(breadCrumbUrls[1].url).to.equal('http://TEST.com/paTh1/path2');
    expect(breadCrumbUrls[1].breadcrumb).to.equal('Path2');
  });

  it('handles no breadcrumbs case', function () {
    const breadCrumbUrls = getBreadCrumbUrls([], 'http://test.com');
    expect(breadCrumbUrls.length).to.equal(0);
  });

});
