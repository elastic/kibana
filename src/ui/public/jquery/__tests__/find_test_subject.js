import expect from 'expect.js';
import $ from 'jquery';

function $make(subject) {
  return $('<div>').attr('data-test-subj', subject);
}

describe('jQuery.findTestSubject', function () {
  it('finds all of the element with a subject', function () {
    const $container = $('<div>');
    const $match = $make('subject').appendTo($container);
    const $noMatch = $make('notSubject').appendTo($container);

    const $found = $container.findTestSubject('subject');
    expect($found.is($match)).to.be(true);
    expect($found.is($noMatch)).to.be(false);
  });

  it('finds multiple elements with a subject', function () {
    const $container = $('<div>');
    const $match = $make('subject').appendTo($container);
    const $otherMatch = $make('subject').appendTo($container);

    const $found = $container.findTestSubject('subject');
    expect($found.filter($match).size()).to.be(1);
    expect($found.filter($otherMatch).size()).to.be(1);
  });

  it('finds all of the elements with either subject', function () {
    const $container = $('<div>');
    const $match1 = $make('subject').appendTo($container);
    const $match2 = $make('alsoSubject').appendTo($container);
    const $noMatch = $make('notSubject').appendTo($container);

    const $found = $container.findTestSubject('subject', 'alsoSubject');
    expect($found.filter($match1).size()).to.be(1);
    expect($found.filter($match2).size()).to.be(1);
    expect($found.filter($noMatch).size()).to.be(0);
  });

  it('finds all of the elements with a decendant selector', function () {
    const $container = $('<div>');
    const $parent = $make('foo name').appendTo($container);
    const $bar = $make('bar othername').appendTo($parent);
    const $baz = $make('baz third name').appendTo($parent);

    expect($container.findTestSubject('foo bar').is($bar)).to.be(true);
    expect($container.findTestSubject('foo bar').is($baz)).to.be(false);

    expect($container.findTestSubject('foo baz').is($bar)).to.be(false);
    expect($container.findTestSubject('foo baz').is($baz)).to.be(true);
  });

  it('finds elements with compound subjects', function () {
    const $container = $('<div>');
    const $bar = $make('button bar').appendTo($container);
    const $baz = $make('button baz').appendTo($container);

    expect($container.findTestSubject('button&bar').is($bar)).to.be(true);
    expect($container.findTestSubject('button& bar').is($bar)).to.be(true);
    expect($container.findTestSubject('button & bar').is($bar)).to.be(true);
    expect($container.findTestSubject('button &bar').is($bar)).to.be(true);

    expect($container.findTestSubject('button&baz').is($baz)).to.be(true);
    expect($container.findTestSubject('button& baz').is($baz)).to.be(true);
    expect($container.findTestSubject('button & baz').is($baz)).to.be(true);
    expect($container.findTestSubject('button &baz').is($baz)).to.be(true);
  });
});
