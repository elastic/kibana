import expect from 'expect.js';
import ObjDefine from 'ui/utils/obj_define';

describe('ObjDefine Utility', function () {

  function flatten(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  describe('#writ', function () {
    it('creates writeable properties', function () {
      let def = new ObjDefine();
      def.writ('name', 'foo');

      let obj = def.create();
      expect(obj).to.have.property('name', 'foo');

      obj.name = 'bar';
      expect(obj).to.have.property('name', 'bar');
    });

    it('exports the property to JSON', function () {
      let def = new ObjDefine();
      def.writ('name', 'foo');
      expect(flatten(def.create())).to.have.property('name', 'foo');
    });

    it('does not export property to JSON it it\'s undefined or null', function () {
      let def = new ObjDefine();
      def.writ('name');
      expect(flatten(def.create())).to.not.have.property('name');

      def.writ('name', null);
      expect(flatten(def.create())).to.not.have.property('name');
    });

    it('switched to exporting if a value is written', function () {
      let def = new ObjDefine();
      def.writ('name');

      let obj = def.create();
      expect(flatten(obj)).to.not.have.property('name');

      obj.name = null;
      expect(flatten(obj)).to.not.have.property('name');

      obj.name = 'foo';
      expect(flatten(obj)).to.have.property('name', 'foo');
    });

    it('setting a writ value to null prevents it from exporting', function () {
      let def = new ObjDefine();
      def.writ('name', 'foo');

      let obj = def.create();
      expect(flatten(obj)).to.have.property('name', 'foo');

      obj.name = null;
      expect(flatten(obj)).to.not.have.property('name');
    });

  });

  describe('#fact', function () {
    it('creates an immutable field', function () {
      let def = new ObjDefine();
      let val = 'foo';
      let notval = 'bar';
      def.fact('name', val);
      let obj = def.create();


      obj.name = notval; // UPDATE SHOULD BE IGNORED
      expect(obj).to.have.property('name', val);
    });

    it('exports the fact to JSON', function () {
      let def = new ObjDefine();
      def.fact('name', 'foo');
      expect(flatten(def.create())).to.have.property('name', 'foo');
    });
  });

  describe('#comp', function () {
    it('creates an immutable field', function () {
      let def = new ObjDefine();
      let val = 'foo';
      let notval = 'bar';
      def.comp('name', val);
      let obj = def.create();

      expect(function () {
        'use strict'; // eslint-disable-line strict

        obj.name = notval;
      }).to.throwException();
    });

    it('does not export the computed value to JSON', function () {
      let def = new ObjDefine();
      def.comp('name', 'foo');
      expect(flatten(def.create())).to.not.have.property('name');
    });
  });


  describe('#create', function () {
    it('creates object that inherits from the prototype', function () {
      function SomeClass() {}

      let def = new ObjDefine(null, SomeClass.prototype);
      let obj = def.create();

      expect(obj).to.be.a(SomeClass);
    });

    it('uses the defaults for property values', function () {
      let def = new ObjDefine({ name: 'bar' });
      def.fact('name');

      let obj = def.create();

      expect(obj).to.have.property('name', 'bar');
    });

    it('ignores default values that are not defined propertyes', function () {
      let def = new ObjDefine({ name: 'foo', name2: 'bar' });
      let obj = def.create();

      expect(obj).to.not.have.property('name');
      expect(obj).to.not.have.property('name2');
    });
  });

});
