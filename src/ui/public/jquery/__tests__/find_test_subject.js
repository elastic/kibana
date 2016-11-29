import expect from 'expect.js';
import $ from 'jquery';

function $make(subject) {
  return $('<div>').attr('data-test-subj', subject);
}

describe('jQuery.findTestSubject', function () {
  it('finds all of the element with a subject', function () {
    let $container = $('<div>');
    let $match = $make('subject').appendTo($container);
    let $noMatch = $make('notSubject').appendTo($container);

    let $found = $container.findTestSubject('subject');
    expect($found.is($match)).to.be(true);
    expect($found.is($noMatch)).to.be(false);
  });

  it('finds multiple elements with a subject', function () {
    let $container = $('<div>');
    let $match = $make('subject').appendTo($container);
    let $otherMatch = $make('subject').appendTo($container);

    let $found = $container.findTestSubject('subject');
    expect($found.filter($match).size()).to.be(1);
    expect($found.filter($otherMatch).size()).to.be(1);
  });

  it('finds all of the elements with either subject', function () {
    let $container = $('<div>');
    let $match1 = $make('subject').appendTo($container);
    let $match2 = $make('alsoSubject').appendTo($container);
    let $noMatch = $make('notSubject').appendTo($container);

    let $found = $container.findTestSubject('subject', 'alsoSubject');
    expect($found.filter($match1).size()).to.be(1);
    expect($found.filter($match2).size()).to.be(1);
    expect($found.filter($noMatch).size()).to.be(0);
  });

  it('finds all of the elements with a decendant selector', function () {
    let $container = $('<div>');
    let $parent = $make('foo name').appendTo($container);
    let $bar = $make('bar othername').appendTo($parent);
    let $baz = $make('baz third name').appendTo($parent);

    expect($container.findTestSubject('foo bar').is($bar)).to.be(true);
    expect($container.findTestSubject('foo bar').is($baz)).to.be(false);

    expect($container.findTestSubject('foo baz').is($bar)).to.be(false);
    expect($container.findTestSubject('foo baz').is($baz)).to.be(true);
  });

  it('finds elements with compound subjects', function () {
    let $container = $('<div>');
    let $bar = $make('button bar').appendTo($container);
    let $baz = $make('button baz').appendTo($container);

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
