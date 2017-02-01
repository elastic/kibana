import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/highlight';

describe('Highlight', function () {

  let filter;

  let tags;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (highlightFilter, highlightTags) {
    filter = highlightFilter;
    tags = highlightTags;
  }));

  let text = '' +
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
    let highlights = [
      tags.pre + 'hamburger' + tags.post + ' alcatra cupim. Salami capicola boudin pork belly shank picanha.'
    ];
    let result = filter(text, highlights);
    expect(result.indexOf('<mark>hamburger</mark>')).to.be.greaterThan(-1);
    expect(result.split('<mark>hamburger</mark>').length).to.be(text.split('hamburger').length);
  });

  it('should highlight multiple results', function () {
    let highlights = [
      'kevin venison sausage ribeye tongue. ' + tags.pre + 'Chicken' + tags.post + ' bacon ball tip pork. Brisket ' +
      'pork capicola spare ribs pastrami rump sirloin, t-bone ham shoulder jerky turducken bresaola. ' + tags.pre +
      'Chicken' + tags.post + ' cow beef picanha. Picanha'
    ];
    let result = filter(text, highlights);
    expect(result.indexOf('<mark>Chicken</mark>')).to.be.greaterThan(-1);
    expect(result.split('<mark>Chicken</mark>').length).to.be(text.split('Chicken').length);
  });

  it('should highlight multiple hits in a result', function () {
    let highlights = [
      'Bacon ipsum dolor amet ' + tags.pre + 'pork' + tags.post + ' loin ' +
        '' + tags.pre + 'pork' + tags.post + ' cow pig beef chuck ground round shankle ' +
        'sirloin landjaeger',
      'kevin venison sausage ribeye tongue. Chicken bacon ball tip ' +
        '' + tags.pre + 'pork' + tags.post + '. Brisket ' +
        '' + tags.pre + 'pork' + tags.post + ' capicola spare ribs',
      'hamburger alcatra cupim. Salami capicola boudin ' + tags.pre + 'pork' + tags.post + ' ' +
        'belly shank picanha.'
    ];
    let result = filter(text, highlights);
    expect(result.indexOf('<mark>pork</mark>')).to.be.greaterThan(-1);
    expect(result.split('<mark>pork</mark>').length).to.be(text.split('pork').length);
  });

  it('should accept an object and return a string containing its properties', function () {
    let obj = { foo: 1, bar: 2 };
    let result = filter(obj, null);
    expect(result.indexOf('' + obj)).to.be(-1);
    expect(result.indexOf('foo')).to.be.greaterThan(-1);
    expect(result.indexOf('bar')).to.be.greaterThan(-1);
  });
});
