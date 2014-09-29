define(function (require) {
  describe('HTML Escape Util', function () {
    var htmlEscape = require('utils/html_escape');

    it('removes tags by replacing their angle-brackets', function () {
      expect(htmlEscape('<h1>header</h1>')).to.eql('&lt;h1&gt;header&lt;/h1&gt;');
    });

    it('removes attributes from tags using &quot; and &#39;', function () {
      expect(htmlEscape('<h1 onclick="alert(\'hi\');">header</h1>'))
      .to.eql('&lt;h1 onclick=&quot;alert(&#39;hi&#39;);&quot;&gt;header&lt;/h1&gt;');
    });

    it('escapes existing html entities by escaping their leading &', function () {
      expect(htmlEscape('&lt;h1&gt;header&lt;/h1&gt;'))
      .to.eql('&amp;lt;h1&amp;gt;header&amp;lt;/h1&amp;gt;');
    });
  });
});