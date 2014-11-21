define(function (require) {
  describe('Highlight', function () {
    var angular = require('angular');
    require('components/highlight/highlight');

    var filter, tags;

    beforeEach(module('kibana'));
    beforeEach(inject(function (highlightFilter, highlightTags) {
      filter = highlightFilter;
      tags = highlightTags;
    }));

    var text = '' +
      'Bacon ipsum dolor amet pork loin pork cow pig beef chuck ground round shankle sirloin landjaeger kevin ' +
      'venison sausage ribeye tongue. Chicken bacon ball tip pork. Brisket pork capicola spare ribs pastrami rump ' +
      'sirloin, t-bone ham shoulder jerky turducken bresaola. Chicken cow beef picanha. Picanha hamburger alcatra ' +
      'cupim. Salami capicola boudin pork belly shank picanha.';

    it('should not modify text if highlight is empty', function () {
      expect(filter(text, undefined)).to.be(text);
      expect(filter(text, null)).to.be(text);
      expect(filter(text, [])).to.be(text);
    });

    it('should highlight a single result', function () {
      var highlights = [
        tags.pre + 'hamburger' + tags.post + ' alcatra cupim. Salami capicola boudin pork belly shank picanha.'
      ];
      var result = filter(text, highlights);
      expect(result.indexOf('<em>hamburger</em>')).to.be.greaterThan(-1);
      expect(result.split('<em>hamburger</em>').length).to.be(text.split('hamburger').length);
    });

    it('should highlight multiple results', function () {
      var highlights = [
        'kevin venison sausage ribeye tongue. ' + tags.pre + 'Chicken' + tags.post + ' bacon ball tip pork. Brisket ' +
        'pork capicola spare ribs pastrami rump sirloin, t-bone ham shoulder jerky turducken bresaola. ' + tags.pre +
        'Chicken' + tags.post + ' cow beef picanha. Picanha'
      ];
      var result = filter(text, highlights);
      expect(result.indexOf('<em>Chicken</em>')).to.be.greaterThan(-1);
      expect(result.split('<em>Chicken</em>').length).to.be(text.split('Chicken').length);
    });

    it('should highlight multiple hits in a result', function () {
      var highlights = [
        'Bacon ipsum dolor amet ' + tags.pre + 'pork' + tags.post + ' loin ' +
          '' + tags.pre + 'pork' + tags.post + ' cow pig beef chuck ground round shankle ' +
          'sirloin landjaeger',
        'kevin venison sausage ribeye tongue. Chicken bacon ball tip ' +
          '' + tags.pre + 'pork' + tags.post + '. Brisket ' +
          '' + tags.pre + 'pork' + tags.post + ' capicola spare ribs',
        'hamburger alcatra cupim. Salami capicola boudin ' + tags.pre + 'pork' + tags.post + ' ' +
          'belly shank picanha.'
      ];
      var result = filter(text, highlights);
      expect(result.indexOf('<em>pork</em>')).to.be.greaterThan(-1);
      expect(result.split('<em>pork</em>').length).to.be(text.split('pork').length);
    });

    it('should accept an object and return a string containing its properties', function () {
      var obj = {foo: 1, bar: 2};
      var result = filter(obj, null);
      expect(result.indexOf('' + obj)).to.be(-1);
      expect(result.indexOf('foo')).to.be.greaterThan(-1);
      expect(result.indexOf('bar')).to.be.greaterThan(-1);
    });
  });
});