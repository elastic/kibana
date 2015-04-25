define(function (require) {
  describe('FieldEditor directive', function () {
    var _ = require('lodash');
    var $ = require('jquery');

    var Field;
    var StringFormat;
    var $rootScope;

    var compile;
    var $scope;
    var $el;

    // just some properties of field that we can compare
    var fieldProps = [
      'name', 'type', 'count', 'scripted', 'script', 'lang',
      'indexed', 'analyzed', 'doc_values', 'format', 'sortable',
      'bucketable', 'filterable', 'indexPattern', 'displayName',
      'editRoute'
    ];

    var fieldToPrimativeVals = function (field) {
      return _(field).pick(fieldProps).omit(function (v) {
        return v && (typeof v === 'object' || typeof v === 'function');
      }).value();
    };

    beforeEach(module('kibana'));
    beforeEach(inject(function ($compile, $injector, Private) {
      $rootScope = $injector.get('$rootScope');
      Field = Private(require('components/index_patterns/_field'));
      StringFormat = Private(require('registry/field_formats')).getType('string');

      $rootScope.indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      $rootScope.field = $rootScope.indexPattern.fields.byName.time;
      // set the field format for this field
      $rootScope.indexPattern.fieldFormatMap[$rootScope.field.name] = new StringFormat({ foo: 1, bar: 2 });


      compile = function () {
        $el = $compile($('<field-editor field="field" index-pattern="indexPattern">'))($rootScope);
        $scope = $el.data('$isolateScope');
      };
    }));

    describe('$scope', function () {
      it('is isolated', function () {
        compile();
        expect($scope.parent == null).to.be.ok();
        expect($scope).to.not.be($rootScope);
      });

      it('exposes $scope.editor, a controller for the editor', function () {
        compile();
        var editor = $scope.editor;
        expect(editor).to.be.an('object');
      });
    });

    describe('$scope.editor', function () {
      var editor;

      beforeEach(function () {
        compile();
        editor = $scope.editor;
      });

      it('exposes editor.indexPattern', function () {
        expect(editor.indexPattern).to.be($rootScope.indexPattern);
      });

      it('exposes editor.fieldProps', function () {
        expect(editor.fieldProps).to.be.an('object');
      });

      describe('editor.fieldProps', function () {
        it('is a shadow copy of the index patterns field spec', function () {
          var actual = $rootScope.field;
          var spec = editor.fieldProps;

          expect(spec).to.not.be(actual.$$spec);
          expect(actual.$$spec.isPrototypeOf(spec)).to.be(true);
        });
      });


      it('exposes editor.field', function () {
        expect(editor.field).to.be.an('object');
      });

      describe('editor.field', function () {
        it('looks like the field from the index pattern, but isn\'t', function () {
          var field = editor.field;
          var actual = $rootScope.field;

          expect(field).to.not.be(actual);
          expect(field).to.be.a(Field);
          expect(fieldToPrimativeVals(field)).to.eql(fieldToPrimativeVals(actual));
        });

        it('is built to match the editor.fieldProps', function () {
          expect(editor.field).to.have.property('name', editor.fieldProps.name);
          expect(editor.field).to.have.property('type', editor.fieldProps.type);

          editor.fieldProps.name = 'smith';
          $rootScope.$apply();
          expect(editor.field.name).to.be('smith');

        });

        it('is rebuilt when the fieldProps changes', function () {
          expect(editor.field.name).to.be(editor.fieldProps.name);
          var newName = editor.fieldProps.name = editor.fieldProps.name + 'foo';
          expect(editor.field.name).to.not.be(newName); // rebuilt after $digest
          $rootScope.$apply();
          expect(editor.field.name).to.be(newName);
          expect(editor.fieldProps.name).to.be(newName);
        });
      });

      it('exposes editor.formatParams', function () {
        expect(editor).to.have.property('formatParams');
        expect(editor.field.format.params()).to.eql(editor.formatParams);
      });

      describe('editor.formatParams', function () {
        it('initializes with all of the formats current params', function () {
          // rebuild the editor
          compile();
          editor = $scope.editor;

          expect(editor.formatParams).to.have.property('foo', 1);
          expect(editor.formatParams).to.have.property('bar', 2);
        });

        it('updates the fields format when changed', function () {
          $rootScope.$apply(); // initial apply in order to pick up change
          editor.formatParams.foo = 200;
          $rootScope.$apply();
          expect(editor.field.format.param('foo')).to.be(200);
        });

      });
    });

  });
});
