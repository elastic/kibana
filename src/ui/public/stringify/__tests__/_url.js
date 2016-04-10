import $ from 'jquery';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
describe('Url Format', function () {

  let fieldFormats;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(RegistryFieldFormatsProvider);
  }));

  describe('Url Format', function () {
    let Url;

    beforeEach(function () {
      Url = fieldFormats.getType('url');
    });

    it('ouputs a simple <a> tab by default', function () {
      var url = new Url();

      var $a = $(url.convert('http://elastic.co', 'html'));
      expect($a.is('a')).to.be(true);
      expect($a.size()).to.be(1);
      expect($a.attr('href')).to.be('http://elastic.co');
      expect($a.attr('target')).to.be('_blank');
      expect($a.children().size()).to.be(0);
    });

    it('outputs an <image> if type === "img"', function () {
      var url = new Url({ type: 'img' });

      var $img = $(url.convert('http://elastic.co', 'html'));
      expect($img.is('img')).to.be(true);
      expect($img.attr('src')).to.be('http://elastic.co');
    });

    describe('url template', function () {
      it('accepts a template', function () {
        var url = new Url({ urlTemplate: 'url: {{ value }}' });
        var $a = $(url.convert('url', 'html'));
        expect($a.is('a')).to.be(true);
        expect($a.size()).to.be(1);
        expect($a.attr('href')).to.be('url: url');
        expect($a.attr('target')).to.be('_blank');
        expect($a.children().size()).to.be(0);
      });

      it('only outputs the url if the contentType === "text"', function () {
        var url = new Url();
        expect(url.convert('url', 'text')).to.be('url');
      });
    });

    describe('label template', function () {
      it('accepts a template', function () {
        var url = new Url({ labelTemplate: 'extension: {{ value }}' });
        var $a = $(url.convert('php', 'html'));
        expect($a.is('a')).to.be(true);
        expect($a.size()).to.be(1);
        expect($a.attr('href')).to.be('php');
        expect($a.html()).to.be('extension: php');
      });

      it('uses the label template for text formating', function () {
        var url = new Url({ labelTemplate: 'external {{value }}'});
        expect(url.convert('url', 'text')).to.be('external url');
      });

      it('can use the raw value', function () {
        var url = new Url({
          labelTemplate: 'external {{value}}'
        });
        expect(url.convert('url?', 'text')).to.be('external url?');
      });

      it('can use the url', function () {
        var url = new Url({
          urlTemplate: 'http://google.com/{{value}}',
          labelTemplate: 'external {{url}}'
        });
        expect(url.convert('url?', 'text')).to.be('external http://google.com/url%3F');
      });
    });

    describe('templating', function () {
      it('ignores unknown variables', function () {
        var url = new Url({ urlTemplate: '{{ not really a var }}' });
        expect(url.convert('url', 'text')).to.be('');
      });

      it('does not allow executing code in variable expressions', function () {
        window.SHOULD_NOT_BE_TRUE = false;
        var url = new Url({ urlTemplate: '{{ (window.SHOULD_NOT_BE_TRUE = true) && value }}' });
        expect(url.convert('url', 'text')).to.be('');
      });

      describe('', function () {
        it('does not get values from the prototype chain', function () {
          var url = new Url({ urlTemplate: '{{ toString }}' });
          expect(url.convert('url', 'text')).to.be('');
        });
      });
    });
  });
});
