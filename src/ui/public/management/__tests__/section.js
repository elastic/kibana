import expect from 'expect.js';

import ManagementSection from 'ui/management/section';
import IndexedArray from 'ui/indexed_array';

describe('ManagementSection', () => {
  describe('constructor', () => {
    it('defaults display to id', () => {
      const section = new ManagementSection('kibana');
      expect(section.display).to.be('kibana');
    });

    it('exposes items', () => {
      const section = new ManagementSection('kibana');
      expect(section.items).to.be.empty();
    });

    it('assigns all options', () => {
      const section = new ManagementSection('kibana', { description: 'test' });
      expect(section.description).to.be('test');
    });
  });

  describe('register', () => {
    let section;

    beforeEach(() => {
      section = new ManagementSection('kibana');
    });

    it('returns a ManagementSection', () => {
      expect(section.register('about')).to.be.a(ManagementSection);
    });

    it('provides a reference to the parent', () => {
      expect(section.register('about').parent).to.be(section);
    });

    it('adds item', function () {
      section.register('about', { description: 'test' });

      expect(section.items).to.have.length(1);
      expect(section.items[0]).to.be.a(ManagementSection);
      expect(section.items[0].id).to.be('about');
    });

    it('can only register a section once', () => {
      let threwException = false;
      section.register('about');

      try {
        section.register('about');
      } catch (e) {
        threwException = e.message.indexOf('is already registered') > -1;
      };

      expect(threwException).to.be(true);
    });
  });

  describe('deregister', () => {
    let section;

    beforeEach(() => {
      section = new ManagementSection('kibana');
      section.register('about');
    });

    it ('deregisters an existing section', () => {
      section.deregister('about');
      expect(section.items).to.have.length(0);
    });

    it ('allows deregistering a section more than once', () => {
      section.deregister('about');
      section.deregister('about');
      expect(section.items).to.have.length(0);
    });

  });

  describe('getSection', () => {
    let section;

    beforeEach(() => {
      section = new ManagementSection('kibana');
      section.register('about');
    });

    it('returns registered section', () => {
      expect(section.getSection('about')).to.be.a(ManagementSection);
    });

    it('returns undefined if un-registered', () => {
      expect(section.getSection('unknown')).to.be(undefined);
    });
  });

  describe('items', () => {
    let section;

    beforeEach(() => {
      section = new ManagementSection('kibana');

      section.register('three', { order: 3 });
      section.register('one', { order: 1 });
      section.register('two', { order: 2 });
    });

    it('is an indexed array', () => {
      expect(section.items).to.be.a(IndexedArray);
    });

    it('is indexed on id', () => {
      const keys = Object.keys(section.items.byId).sort();
      expect(section.items.byId).to.be.an('object');

      expect(keys).to.eql(['one', 'three', 'two']);
    });

    it('can be ordered', () => {
      const ids = section.items.inOrder.map((i) => { return i.id; });
      expect(ids).to.eql(['one', 'two', 'three']);
    });
  });
});
