/**
 * TODO: move this into it's own module, with it's own dependencies
 */

require.config({
  paths: {
    // jade runtime is required by the AMD wrapped jade templates as "jade"
    jade: '/amd-wrap/node_modules/grunt-contrib-jade/node_modules/jade/runtime'
  }
});

// fake fs module to make jade/runtime.js happy
define('fs', function () {});

// fake process obejct to make browserify-path happy
window.process = window.process || { cwd: function () { return '.'; }};

// the actual reporter module
define(function (require) {

  var _ = require('lodash');
  var $ = require('jquery');

  var InsertionText = require('/amd-wrap/node_modules/istanbul/lib/util/insertion-text.js');
  var objUtils = require('/amd-wrap/node_modules/istanbul/lib/object-utils.js');
  // var annotate = require('/amd-wrap/node_modules/istanbul/lib/annotate.js');
  var Progress = require('/amd-wrap/node_modules/mocha/lib/browser/progress.js');
  var path = require('/amd-wrap/node_modules/path-browserify/index.js');

  var template = require('./report.jade');

  var Base = window.Mocha.reporters.Base;

  var covGrepQueryParamRE = /cov_grep=([^&]+)/;

  var afterDraw = window.requestAnimationFrame || function (cb) { setTimeout(cb, 500); };

  function IstanbulReporter(runner) {
    // "inherit" the base reporters characteristics
    Base.call(this, runner);

    var stats = this.stats;
    var gotoFile = window.location.hash;
    if (gotoFile) window.location.hash = '';

    $(document.body)
      .html('<center><canvas width="40" height="40"></canvas></center>');

    var canvas = document.getElementsByTagName('canvas')[0];
    var ctx;
    var progress;
    if (canvas.getContext) {
      var ratio = window.devicePixelRatio || 1;
      canvas.style.width = canvas.width;
      canvas.style.height = canvas.height;
      canvas.width *= ratio;
      canvas.height *= ratio;
      ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      progress = new Progress();
      progress.size(40);
    }

    runner.on('test end', function () {
      if (progress) {
        progress
          .update((stats.tests / this.total) * 100 || 0)
          .draw(ctx);
      }
    });

    runner.on('end', function () {
      var stats = _.omit(this.stats, 'start', 'end', 'suites');

      stats['create report'] = Date.now();
      $(document.body).empty().append($(createReport())); // attempt to force parsing immediately
      stats['create report'] = Date.now() - stats['create report'];

      toSec(stats, 'create report');
      toSec(stats, 'duration');
      console.log(JSON.stringify(stats, null, '  '));

      linkNav();
      if (gotoFile) {
        afterDraw(function () {
          window.location.hash = gotoFile;
        });
      }
    });
  }

  function createReport() {
    var covResults = window.__coverage__;
    var grep = window.location.search.match(covGrepQueryParamRE);
    if (grep) {
      grep = decodeURIComponent(grep[1]);
      covResults = _.transform(covResults, function (results, cov, filename) {
        if (~filename.indexOf(grep)) {
          results[filename] = cov;
        }
      });
    }

    var summary = objUtils.summarizeCoverage(covResults);

    var dirs = _(covResults)
      .map(convertFile)
      .groupBy(function (file) {
        var dir = path.dirname(file.filename);
        return dir === '.' ? '' : dir;
      })
      .transform(function (dirs, files, dirname) {
        _.each(files, function (file) {
          file.relname = dirname ? path.relative(dirname, file.filename) : file.filename;
        });

        dirs.push({
          name: dirname,
          files: files,
          coverage: _.reduce(files, function (sum, file) {
            return sum + file.coverage;
          }, 0) / files.length
        });
      }, [])
      .sortBy('name')
      .value();

    return template({
      cov: {
        dirs: dirs,
        coverage: summary.lines.pct,
        sloc: summary.lines.total,
        hits: summary.lines.covered,
        misses: summary.lines.total - summary.lines.covered
      },
      dirname: path.dirname,
      relative: path.relative,
      coverageClass: function (coverage) {
        if (coverage >= 75) return 'high';
        if (coverage >= 50) return 'medium';
        if (coverage >= 25) return 'low';
        return 'terrible';
      }
    });
  }

  function convertFile(file) {
    var summary = objUtils.summarizeFileCoverage(file);
    var count = 0;
    var structured = file.code.map(function (str) {
      count += 1;
      return {
        line: count,
        covered: null,
        text: new InsertionText(str, true)
      };
    });
    var html = '';

    structured.unshift({
      line: 0,
      covered: null,
      text: new InsertionText('')
    });

    _.forOwn(file.l, function (count, lineNumber) {
      structured[lineNumber].covered = count > 0 ? true : false;
    });

    // annotate.Lines(file, structured);
    //note: order is important, since statements typically result in spanning the whole line and doing branches late
    //causes mismatched tags
    // annotate.Branches(file, structured);
    // annotate.Functions(file, structured);
    // annotate.Statements(file, structured);

    structured.shift();

    var context = {
      filename: file.path,
      sloc: summary.lines.total,
      coverage: summary.lines.pct,
      hits: summary.lines.covered,
      misses: summary.lines.total - summary.lines.covered,
      source: _.map(structured, function (line, lineNumber) {
        return {
          coverage: file.l[line.line],
          source: line.text + ''
        };
      })
    };

    return context;

    // writer.write(detailTemplate(context));
    // writer.write('</table></pre>\n');
    // writer.write(footerTemplate(templateData));
  }

  function linkNav() {
    var headings = $('h2').toArray();

    // when scrolling, highlight the related menu item
    $(window).scroll(function (e) {
      var heading = find(window.scrollY);
      if (!heading) return;
      var links = document.querySelectorAll('#menu a')
        , link;

      for (var i = 0, len = links.length; i < len; ++i) {
        link = links[i];
        link.className = link.getAttribute('href') === '#' + heading.id
          ? 'active'
          : '';
      }
    });

    // find the file they are probably looking at
    function find(y) {
      var i = headings.length
        , heading;

      while (i--) {
        heading = headings[i];
        if (y >= heading.offsetTop) {
          return heading;
        }
      }
    }

    $('#menu').on('click', '.dirname .cov', function () {
      var dir = $(this).parent()[0].childNodes[0].textContent;
      var loc = window.location;
      var proto = loc.protocol;
      var host = loc.host;
      var path = loc.pathname;
      var search = loc.search;
      var hash = loc.hash;

      var grep = 'cov_grep=' + encodeURIComponent(dir);
      if (search && search.match(covGrepQueryParamRE)) {
        search = search.replace(covGrepQueryParamRE, grep);
      } else {
        search = (search ? search + '&' : '?') + grep;
      }

      window.location = path + search + hash;
    });
  }

  function toSec(stats, prop) {
    return stats[prop] = (stats[prop] / 1000).toFixed(2) + ' sec';
  }

  return IstanbulReporter;
});