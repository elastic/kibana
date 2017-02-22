import expect from 'expect.js';

import { getBreadCrumbUrls } from '../bread_crumbs/bread_crumb_urls';

describe('getBreadCrumbUrls', function () {

  it('returns urls for the breadcrumbs', function () {
    const breadCrumbUrls = getBreadCrumbUrls(
      ['path1', 'path2', 'a', 'longlonglonglong'],
      'http://test.com/path1/path2/a/longlonglonglong');
    expect(breadCrumbUrls.length).to.equal(4);
    expect(breadCrumbUrls[0].url).to.equal('http://test.com/path1');
    expect(breadCrumbUrls[0].title).to.equal('Path 1');

    expect(breadCrumbUrls[1].url).to.equal('http://test.com/path1/path2');
    expect(breadCrumbUrls[1].title).to.equal('Path 2');

    expect(breadCrumbUrls[2].url).to.equal('http://test.com/path1/path2/a');
    expect(breadCrumbUrls[2].title).to.equal('A');

    expect(breadCrumbUrls[3].url).to.equal('http://test.com/path1/path2/a/longlonglonglong');
    expect(breadCrumbUrls[3].title).to.equal('Longlonglonglong');
  });

  it('is case insensitive', function () {
    const breadCrumbUrls = getBreadCrumbUrls(['paTh1', 'path2'], 'http://TEST.com/paTh1/path2');
    expect(breadCrumbUrls.length).to.equal(2);
    expect(breadCrumbUrls[0].url).to.equal('http://TEST.com/paTh1');
    expect(breadCrumbUrls[0].path).to.equal('paTh1');
    expect(breadCrumbUrls[0].title).to.equal('Pa Th 1');

    expect(breadCrumbUrls[1].url).to.equal('http://TEST.com/paTh1/path2');
    expect(breadCrumbUrls[1].title).to.equal('Path 2');
  });

  it('handles no breadcrumbs case', function () {
    const breadCrumbUrls = getBreadCrumbUrls([], 'http://test.com');
    expect(breadCrumbUrls.length).to.equal(0);
  });

  it('handles spaces in breadcrumbs', function () {
    const breadCrumbUrls = getBreadCrumbUrls(
      ['something', 'somethingElse', 'snake_case', 'longLongLongLong'],
      'http://test.com/something/somethingElse/snake_case/longLongLongLong');
    expect(breadCrumbUrls.length).to.equal(4);
    expect(breadCrumbUrls[0].url).to.equal('http://test.com/something');
    expect(breadCrumbUrls[0].title).to.equal('Something');

    expect(breadCrumbUrls[1].url).to.equal('http://test.com/something/somethingElse');
    expect(breadCrumbUrls[1].path).to.equal('somethingElse');
    expect(breadCrumbUrls[1].title).to.equal('Something Else');

    expect(breadCrumbUrls[2].url).to.equal('http://test.com/something/somethingElse/snake_case');
    expect(breadCrumbUrls[2].path).to.equal('snake_case');
    expect(breadCrumbUrls[2].title).to.equal('Snake Case');

    expect(breadCrumbUrls[3].url).to.equal('http://test.com/something/somethingElse/snake_case/longLongLongLong');
    expect(breadCrumbUrls[3].title).to.equal('Long Long Long Long');
  });

});
