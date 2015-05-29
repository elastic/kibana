define(function (require) {
  describe('kbnGrid Styles', function () {
    var _ = require('lodash');
    var $ = require('jquery');

    var $style = $('<style>').html(require('text!styles/main.css'));
    var basicRows = require('text!test/unit/fixtures/kbnGridExamples/basicRows.html');
    var basicColumns = require('text!test/unit/fixtures/kbnGridExamples/basicColumns.html');
    var nestedRowsAndColumns = require('text!test/unit/fixtures/kbnGridExamples/nestedRowsAndColumns.html');

    // all created elements will be put here and then cleaned up in afterEach();
    var trash = [];

    function render(tmpl) {
      var $el = $('<div>').append($style).append(tmpl).appendTo(document.body);
      trash.push($el);
      return $el;
    }

    /**
     * Check to see if a and b are within + or - n
     *
     * @param  {number} n
     * @param  {number} a
     * @param  {number} b
     * @return {boolean}
     */
    function plusMinus(n, a, b) {
      return Math.abs(a - b) <= n;
    }

    afterEach(function () {
      trash.splice(0).forEach(function ($el) {
        $el.remove();
      });
    });

    describe('basic rows', function () {
      it('renders the template we expect', function () {
        // we count elements here just to make sure that the tests are updated if/when the tests change
        var $el = render(basicRows);
        expect($el.find('gr')).to.have.length(2);
        expect($el.find('gr > *')).to.have.length(4);
      });

      it('renders elements within the row next to each other', function () {
        render().find('gr').each(function () {
          var cursor = $(this).position().left;

          $(this).children().each(function (i) {
            var left = $(this).position().left;
            if (i > 0) expect(left).to.be.greaterThan(cursor);
            else expect(left).to.be(cursor);
            cursor = left;
          });
        });
      });

      it('renders each child of the row an equal width', function () {
        render(basicRows).find('gr').each(function () {
          var widths = $(this).children().map(function () {
            return $(this).width();
          });

          expect(plusMinus(1, _.min(widths), _.max(widths))).to.be(true);
        });
      });

      it('matches the content width of a cell that has the no-flex attribute', function () {
        var $content = $('<span>alt-content</span>');

        render(basicRows).find('gd,gh').each(function () {
          var $cell = $(this);
          $cell.html($content);
          expect($cell.width()).to.be.greaterThan($content.width());
          $cell.attr('no-flex', 'no-flex');
          expect(plusMinus(1, $cell.width(), $content.width())).to.be(true);
        });
      });
    });

    describe('basic columns', function () {
      it('renders the template we expect', function () {
        var $rows = render(basicColumns).find('gr');
        var $columns = $rows.children('gc');
        $columns.each(function () {
          expect($(this).children('gh')).to.have.length(1);
          expect($(this).children('gd')).to.have.length(1);
        });
        expect($rows).to.have.length(1);
        expect($columns).to.have.length(2);
      });

      it('renders elements within the column under each other', function () {
        render(basicColumns).find('gc').each(function () {
          var cursor = $(this).position().top;

          $(this).children().each(function (i) {
            var top = $(this).position().top;
            if (i > 0) expect(top).to.be.greaterThan(cursor);
            else expect(top).to.be(cursor);
            cursor = top;
          });
        });
      });

      it('renders each child of the column as a row that matches it\'s content-height', function () {
        var height = 50;
        var $content = $('<div></div>').css({ width: height, height: height });

        render(basicColumns).find('gd,gh').each(function () {
          var $cell = $(this);

          expect(plusMinus(1, $cell.height(), height)).to.be(false);
          $cell.html($content);
          expect(plusMinus(1, $cell.height(), height)).to.be(true);
        });
      });

      it('evently distributes the remaining parent height amonst all cells with flex attribute', function () {
        var $col = render(basicColumns).find('gc').first();
        var $cells = $col.children();

        var totalHeight = _.reduce($cells, function (m, c) { return m + $(c).outerHeight(); }, 0);
        expect($col.height()).to.be(totalHeight);

        var extraSpace = 10 * $col.length;
        $col.height(totalHeight + extraSpace);

        $cells.each(function (i) {
          var $cell = $(this);
          var totalExpanded = i + 1;
          var myExtraSpace = extraSpace / totalExpanded;

          expect(myExtraSpace).to.be.greaterThan(0);

          var preExpand = $cell.height();
          $cell.attr('flex', 'flex');
          expect(plusMinus(1, $cell.height(), preExpand + myExtraSpace)).to.be(true);
        });
      });
    });
  });
});
