import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'header', 'discover']);

  describe('discover app', function describeIndexTests() {
    before(function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      // delete .kibana index and update configDoc
      return esArchiver.load('discover')
      .then(function loadkibanaIndexPattern() {
        log.debug('load kibana index with default index pattern');
        return kibanaServer.uiSettings.replace({
          'dateFormat:tz': 'UTC',
          'defaultIndex': 'logstash-*'
        });
      })
      // and load a set of makelogs data
      .then(function loadIfEmptyMakelogs() {
        return esArchiver.loadIfNeeded('logstash_functional');
      })
      .then(function () {
        log.debug('discover');
        return PageObjects.common.navigateToApp('discover');
      })
      .then(function () {
        log.debug('setAbsoluteRange');
        return PageObjects.header.setAbsoluteRange(fromTime, toTime);
      });
    });


    describe('field data', function () {
      it('search php should show the correct hit count', function () {
        const expectedHitCount = '445';
        return PageObjects.discover.query('php')
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.discover.getHitCount()
            .then(function compareData(hitCount) {
              screenshots.take('Discover-field-data');
              expect(hitCount).to.be(expectedHitCount);
            });
          });
        });
      });

      it('the search term should be highlighted in the field data', function () {
        // marks is the style that highlights the text in yellow
        return PageObjects.discover.getMarks()
        .then(function (marks) {
          expect(marks.length).to.be(50);
          expect(marks.indexOf('php')).to.be(0);
        });
      });

      it('search _type:apache should show the correct hit count', function () {
        const expectedHitCount = '11,156';
        return PageObjects.discover.query('_type:apache')
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.discover.getHitCount()
            .then(function compareData(hitCount) {
              expect(hitCount).to.be(expectedHitCount);
            });
          });
        });
      });

      it('doc view should show Time and _source columns', function () {
        const expectedHeader = 'Time _source';
        return PageObjects.discover.getDocHeader()
        .then(function (header) {
          expect(header).to.be(expectedHeader);
        });
      });

      it('doc view should show oldest time first', function () {
        // Note: Could just check the timestamp, but might as well check that the whole doc is as expected.
        const ExpectedDoc =
          'September 22nd 2015, 23:50:13.253\nindex:logstash-2015.09.22 @timestamp:September 22nd 2015, 23:50:13.253'
          + ' ip:238.171.34.42 extension:jpg response:200 geo.coordinates:{ "lat": 38.66494528, "lon": -88.45299556'
          + ' } geo.src:FR geo.dest:KH geo.srcdest:FR:KH @tags:success, info utc_time:September 22nd 2015,'
          + ' 23:50:13.253 referer:http://twitter.com/success/nancy-currie agent:Mozilla/4.0 (compatible; MSIE 6.0;'
          + ' Windows NT 5.1; SV1; .NET CLR 1.1.4322) clientip:238.171.34.42 bytes:7,124'
          + ' host:media-for-the-masses.theacademyofperformingartsandscience.org request:/uploads/karl-henize.jpg'
          + ' url:https://media-for-the-masses.theacademyofperformingartsandscience.org/uploads/karl-henize.jpg'
          + ' @message:238.171.34.42 - - [2015-09-22T23:50:13.253Z] "GET /uploads/karl-henize.jpg HTTP/1.1" 200 7124'
          + ' "-" "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)" spaces:this is a'
          + ' thing with lots of spaces wwwwoooooo xss:<script>console.log("xss")</script>'
          + ' headings:<h3>alexander-viktorenko</h5>, http://nytimes.com/warning/michael-massimino'
          + ' links:@www.slate.com, http://www.slate.com/security/frederick-w-leslie, www.www.slate.com'
          + ' relatedContent:{ "url": "http://www.laweekly.com/music/bjork-at-the-nokia-theatre-12-12-2408191",'
          + ' "og:type": "article", "og:title": "Bjork at the Nokia Theatre, 12/12", "og:description": "Bjork at the'
          + ' Nokia Theater, December 12 By Randall Roberts Last night&rsquo;s Bjork show at the Dystopia &ndash;'
          + ' er, I mean Nokia -- Theatre downtown di...", "og:url": "'
          + 'http://www.laweekly.com/music/bjork-at-the-nokia-theatre-12-12-2408191", "article:published_time":'
          + ' "2007-12-13T12:19:35-08:00", "article:modified_time": "2014-11-27T08:28:42-08:00", "article:section":'
          + ' "Music", "og:image": "'
          + 'http://IMAGES1.laweekly.com/imager/bjork-at-the-nokia-theatre-12-12/u/original/2470701/bjorktn003.jpg",'
          + ' "og:image:height": "334", "og:image:width": "480", "og:site_name": "LA Weekly", "twitter:title":'
          + ' "Bjork at the Nokia Theatre, 12/12", "twitter:description": "Bjork at the Nokia Theater, December 12'
          + ' By Randall Roberts Last night&rsquo;s Bjork show at the Dystopia &ndash; er, I mean Nokia -- Theatre'
          + ' downtown di...", "twitter:card": "summary", "twitter:image": "'
          + 'http://IMAGES1.laweekly.com/imager/bjork-at-the-nokia-theatre-12-12/u/original/2470701/bjorktn003.jpg",'
          + ' "twitter:site": "@laweekly" }, { "url": "'
          + 'http://www.laweekly.com/music/the-rapture-at-the-mayan-7-25-2401011", "og:type": "article", "og:title":'
          + ' "The Rapture at the Mayan, 7/25", "og:description": "If you haven&rsquo;t yet experienced the'
          + ' phenomenon of people walk-dancing, apparently the best place to witness this is at a Rapture show.'
          + ' Here&rsquo;s...", "og:url": "http://www.laweekly.com/music/the-rapture-at-the-mayan-7-25-2401011",'
          + ' "article:published_time": "2007-07-26T12:42:30-07:00", "article:modified_time":'
          + ' "2014-11-27T08:00:51-08:00", "article:section": "Music", "og:image": "'
          + 'http://IMAGES1.laweekly.com/imager/the-rapture-at-the-mayan-7-25/u/original/2463272/rapturetn05.jpg",'
          + ' "og:image:height": "321", "og:image:width": "480", "og:site_name": "LA Weekly", "twitter:title": "The'
          + ' Rapture at the Mayan, 7/25", "twitter:description": "If you haven&rsquo;t yet experienced the'
          + ' phenomenon of people walk-dancing, apparently the best place to witness this is at a Rapture show.'
          + ' Here&rsquo;s...", "twitter:card": "summary", "twitter:image": "'
          + 'http://IMAGES1.laweekly.com/imager/the-rapture-at-the-mayan-7-25/u/original/2463272/rapturetn05.jpg",'
          + ' "twitter:site": "@laweekly" } machine.os:win 7 machine.ram:7,516,192,768 _id:AU_x3_g4GFA8no6QjkYX'
          + ' _type:apache _index:logstash-2015.09.22 _score: - relatedContent.article:modified_time:November 27th'
          + ' 2014, 16:00:51.000, November 27th 2014, 16:28:42.000 relatedContent.article:published_time:July 26th'
          + ' 2007, 19:42:30.000, December 13th 2007, 20:19:35.000';
        return PageObjects.discover.getDocTableIndex(1)
        .then(function (rowData) {
          expect(rowData).to.be(ExpectedDoc);
        });
      });

      it('doc view should sort ascending', function () {
        // Note: Could just check the timestamp, but might as well check that the whole doc is as expected.
        const ExpectedDoc =
          'September 20th 2015, 00:00:00.000\nindex:logstash-2015.09.20 @timestamp:September 20th 2015, 00:00:00.000'
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
          + ' machine.ram:15,032,385,536 _id:AU_x3_g3GFA8no6QjkFm _type:apache _index:logstash-2015.09.20 _score: -'
          + ' relatedContent.article:modified_time:October 28th 2014, 22:00:08.000, November 26th 2014,'
          + ' 01:05:47.000, November 26th 2014, 03:52:35.000, November 26th 2014, 04:15:21.000, November 27th 2014,'
          + ' 16:01:03.000 relatedContent.article:published_time:October 21st 2005, 01:10:25.000, March 5th 2006,'
          + ' 01:03:42.000, December 13th 2006, 20:12:04.000, April 4th 2008, 23:00:00.000, April 25th 2008,'
          + ' 14:26:41.000';
        return PageObjects.discover.clickDocSortDown()
        .then(function () {
          // we don't technically need this sleep here because the tryForTime will retry and the
          // results will match on the 2nd or 3rd attempt, but that debug output is huge in this
          // case and it can be avoided with just a few seconds sleep.
          return PageObjects.common.sleep(2000);
        })
        .then(function () {
          return retry.try(function tryingForTime() {
            return PageObjects.discover.getDocTableIndex(1)
            .then(function (rowData) {
              screenshots.take('Discover-sort-down');
              expect(rowData).to.be(ExpectedDoc);
            });
          });
        });
      });


      it('a bad syntax query should show an error message', function () {
        const expectedError = 'Discover: Failed to parse query [xxx(yyy]';
        return PageObjects.discover.query('xxx(yyy')
        .then(function () {
          return PageObjects.header.getToastMessage();
        })
        .then(function (toastMessage) {
          screenshots.take('Discover-syntax-error-toast');
          expect(toastMessage).to.be(expectedError);
        })
        .then(function () {
          return PageObjects.header.clickToastOK();
        });
      });
    });
  });
}
