/*
* Licensed to Elasticsearch B.V. under one or more contributor
* license agreements. See the NOTICE file distributed with
* this work for additional information regarding copyright
* ownership. Elasticsearch B.V. licenses this file to you under
* the Apache License, Version 2.0 (the "License"); you may
* not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const queryBar = getService('queryBar');
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'visualize']);

  describe('discover tab', function describeIndexTests() {
    before(async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('discover');
      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'logstash-*'
      });

      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    });

    describe('field data', function () {
      it('search php should show the correct hit count', async function () {
        const expectedHitCount = '445';
        await queryBar.setQuery('php');
        await queryBar.submitQuery();

        await retry.try(async function tryingForTime() {
          const hitCount = await PageObjects.discover.getHitCount();
          expect(hitCount).to.be(expectedHitCount);
        });

      });

      it('the search term should be highlighted in the field data', async function () {
        // marks is the style that highlights the text in yellow
        const marks = await PageObjects.discover.getMarks();
        expect(marks.length).to.be(50);
        expect(marks.indexOf('php')).to.be(0);
      });

      it('search type:apache should show the correct hit count', async function () {
        const expectedHitCount = '11,156';
        await queryBar.setQuery('type:apache');
        await queryBar.submitQuery();
        await retry.try(async function tryingForTime() {
          const hitCount = await PageObjects.discover.getHitCount();
          expect(hitCount).to.be(expectedHitCount);
        });
      });

      it('doc view should show Time and _source columns', async function () {
        const expectedHeader = 'Time _source';
        const Docheader = await PageObjects.discover.getDocHeader();
        expect(Docheader).to.be(expectedHeader);
      });

      it('doc view should sort ascending', async function () {

        // Note: Could just check the timestamp, but might as well check that the whole doc is as expected.
        const ExpectedDoc =
          'September 20th 2015, 00:00:00.000\ntype:apache index:logstash-2015.09.20 @timestamp:September 20th 2015, 00:00:00.000'
          + ' ip:143.84.142.7 extension:jpg response:200 geo.coordinates:{ "lat": 38.68407028, "lon": -120.9871642 }'
          + ' geo.src:ES geo.dest:US geo.srcdest:ES:US @tags:error, info utc_time:September 20th 2015, 00:00:00.000'
          + ' referer:http://www.slate.com/success/vladimir-kovalyonok agent:Mozilla/4.0 (compatible; MSIE 6.0;'
          + ' Windows NT 5.1; SV1; .NET CLR 1.1.4322) clientip:143.84.142.7 bytes:1,623'
          + ' host:media-for-the-masses.theacademyofperformingartsandscience.org request:/uploads/steven-hawley.jpg'
          + ' url:https://media-for-the-masses.theacademyofperformingartsandscience.org/uploads/steven-hawley.jpg'
          + ' @message:143.84.142.7 - - [2015-09-20T00:00:00.000Z] "GET /uploads/steven-hawley.jpg HTTP/1.1" 200'
          + ' 1623 "-" "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)" spaces:this is a'
          + ' thing with lots of spaces wwwwoooooo xss:<script>console.log("xss")</script>'
          + ' headings:<h3>kimiya-yui</h5>, http://www.slate.com/success/koichi-wakata'
          + ' links:thomas-marshburn@twitter.com, http://www.slate.com/info/michael-p-anderson, www.twitter.com'
          + ' relatedContent:{ "url":'
          + ' "http://www.laweekly.com/music/jay-electronica-much-better-than-his-name-would-suggest-2412364",'
          + ' "og:type": "article", "og:title": "Jay Electronica: Much Better Than His Name Would Suggest",'
          + ' "og:description": "You may not know who Jay Electronica is yet, but I&#039;m willing to bet that you'
          + ' would had he chosen a better name. Jay Electronica does not sound like the ...", "og:url":'
          + ' "http://www.laweekly.com/music/jay-electronica-much-better-than-his-name-would-suggest-2412364",'
          + ' "article:published_time": "2008-04-04T16:00:00-07:00", "article:modified_time":'
          + ' "2014-11-27T08:01:03-08:00", "article:section": "Music", "og:site_name": "LA Weekly", "twitter:title":'
          + ' "Jay Electronica: Much Better Than His Name Would Suggest", "twitter:description": "You may not know'
          + ' who Jay Electronica is yet, but I&#039;m willing to bet that you would had he chosen a better name.'
          + ' Jay Electronica does not sound like the ...", "twitter:card": "summary", "twitter:site": "@laweekly"'
          + ' }, { "url": "http://www.laweekly.com/news/mandoe-on-gower-near-fountain-2368123", "og:type":'
          + ' "article", "og:title": "MANDOE On Gower Near Fountain", "og:description": "MANDOE has a stunner on a'
          + ' wall north of an east-west street crossing Gower around Fountain (but not on Fountain). MADNOE, PROSE'
          + ' and FUKM are listed on t...", "og:url": "'
          + 'http://www.laweekly.com/news/mandoe-on-gower-near-fountain-2368123", "article:published_time":'
          + ' "2008-04-25T07:26:41-07:00", "article:modified_time": "2014-10-28T15:00:08-07:00", "article:section":'
          + ' "News", "og:image": "'
          + 'http://images1.laweekly.com/imager/mandoe-on-gower-near-fountain/u/original/2430891/img_6648.jpg",'
          + ' "og:image:height": "640", "og:image:width": "480", "og:site_name": "LA Weekly", "twitter:title": '
          + '"MANDOE On Gower Near Fountain", "twitter:description": "MANDOE has a stunner on a wall north of an'
          + ' east-west street crossing Gower around Fountain (but not on Fountain). MADNOE, PROSE and FUKM are'
          + ' listed on t...", "twitter:card": "summary", "twitter:image": "'
          + 'http://images1.laweekly.com/imager/mandoe-on-gower-near-fountain/u/original/2430891/img_6648.jpg", '
          + '"twitter:site": "@laweekly" }, { "url": "http://www.laweekly.com/arts/meghan-finds-the-love-2373346",'
          + ' "og:type": "article", "og:title": "Meghan Finds The Love", "og:description": "LA Weekly is the'
          + ' definitive source of information for news, music, movies, restaurants, reviews, and events in Los'
          + ' Angeles.", "og:url": "http://www.laweekly.com/arts/meghan-finds-the-love-2373346",'
          + ' "article:published_time": "2005-10-20T18:10:25-07:00", "article:modified_time":'
          + ' "2014-11-25T19:52:35-08:00", "article:section": "Arts", "og:site_name": "LA Weekly", "twitter:title":'
          + ' "Meghan Finds The Love", "twitter:description": "LA Weekly is the definitive source of information for'
          + ' news, music, movies, restaurants, reviews, and events in Los Angeles.", "twitter:card": "summary",'
          + ' "twitter:site": "@laweekly" }, { "url": "http://www.laweekly.com/arts/these-clowns-are-with-me-2371051'
          + '", "og:type": "article", "og:title": "These Clowns Are With Me", "og:description": "&nbsp; &nbsp; I'
          + ' didn&#039;t mean to blow off all my responsibilities yesterday, but when a schmoozy Hollywood luncheon'
          + ' turns into a full-on party by 3pm, and...", "og:url": "'
          + 'http://www.laweekly.com/arts/these-clowns-are-with-me-2371051", "article:published_time": '
          + '"2006-03-04T17:03:42-08:00", "article:modified_time": "2014-11-25T17:05:47-08:00", "article:section":'
          + ' "Arts", "og:image": "'
          + 'http://images1.laweekly.com/imager/these-clowns-are-with-me/u/original/2434556/e4b8scd.jpg",'
          + ' "og:image:height": "375", "og:image:width": "500", "og:site_name": "LA Weekly", "twitter:title":'
          + ' "These Clowns Are With Me", "twitter:description": "&nbsp; &nbsp; I didn&#039;t mean to blow off all'
          + ' my responsibilities yesterday, but when a schmoozy Hollywood luncheon turns into a full-on party by'
          + ' 3pm, and...", "twitter:card": "summary", "twitter:image": "'
          + 'http://images1.laweekly.com/imager/these-clowns-are-with-me/u/original/2434556/e4b8scd.jpg",'
          + ' "twitter:site": "@laweekly" }, { "url": "http://www.laweekly.com/arts/shopping-daze-2373807",'
          + ' "og:type": "article", "og:title": "Shopping Daze", "og:description": "LA Weekly is the definitive '
          + 'source of information for news, music, movies, restaurants, reviews, and events in Los Angeles.",'
          + ' "og:url": "http://www.laweekly.com/arts/shopping-daze-2373807", "article:published_time":'
          + ' "2006-12-13T12:12:04-08:00", "article:modified_time": "2014-11-25T20:15:21-08:00", "article:section":'
          + ' "Arts", "og:site_name": "LA Weekly", "twitter:title": "Shopping Daze", "twitter:description": "LA'
          + ' Weekly is the definitive source of information for news, music, movies, restaurants, reviews, and'
          + ' events in Los Angeles.", "twitter:card": "summary", "twitter:site": "@laweekly" } machine.os:osx'
          + ' machine.ram:15,032,385,536 _id:AU_x3_g3GFA8no6QjkFm _type:doc _index:logstash-2015.09.20 _score: -'
          + ' relatedContent.article:modified_time:October 28th 2014, 22:00:08.000, November 26th 2014,'
          + ' 01:05:47.000, November 26th 2014, 03:52:35.000, November 26th 2014, 04:15:21.000, November 27th 2014,'
          + ' 16:01:03.000 relatedContent.article:published_time:October 21st 2005, 01:10:25.000, March 5th 2006,'
          + ' 01:03:42.000, December 13th 2006, 20:12:04.000, April 4th 2008, 23:00:00.000, April 25th 2008,'
          + ' 14:26:41.000';
        await PageObjects.discover.clickDocSortDown();

        // we don't technically need this sleep here because the tryForTime will retry and the
        // results will match on the 2nd or 3rd attempt, but that debug output is huge in this
        // case and it can be avoided with just a few seconds sleep.
        await PageObjects.common.sleep(2000);
        await retry.try(async function tryingForTime() {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be(ExpectedDoc);
        });
      });

      it('a bad syntax query should show an error message', async function () {
        const expectedError = 'Discover: Failed to parse query [xxx(yyy))]';
        await queryBar.setQuery('xxx(yyy))');
        await queryBar.submitQuery();
        const toastMessage =  await PageObjects.header.getToastMessage();
        expect(toastMessage).to.contain(expectedError);
        await PageObjects.header.clickToastOK();
      });
    });
  });
}
