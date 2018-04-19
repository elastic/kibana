import $ from 'jquery';
import _ from 'lodash';
import aggSelectHtml from './agg_select.html';
import advancedToggleHtml from './advanced_toggle.html';
import '../../../filters/match_any';
import './agg_param';
import { AggTypesIndexProvider } from '../../../agg_types';
import { uiModules } from '../../../modules';
import { documentationLinks } from '../../../documentation_links/documentation_links';
import aggParamsTemplate from './agg_params.html';

uiModules
  .get('app/visualize')
  .directive('visEditorAggParams', function ($compile, $parse, Private) {
    const aggTypes = Private(AggTypesIndexProvider);

    return {
      restrict: 'E',
      template: aggParamsTemplate,
      scope: true,
      link: function ($scope, $el, attr) {
        $scope.$bind('agg', attr.agg);
        $scope.$bind('groupName', attr.groupName);

        $scope.aggTypeOptions = aggTypes.byType[$scope.groupName];
        $scope.advancedToggled = false;

        // We set up this watch prior to adding the controls below, because when the controls are added,
        // there is a possibility that the agg type can be automatically selected (if there is only one)
        $scope.$watch('agg.type', updateAggParamEditor);

        // this will contain the controls for the schema (rows or columns?), which are unrelated to
        // controls for the agg, which is why they are first
        addSchemaEditor();

        // allow selection of an aggregation
        addAggSelector();

        function addSchemaEditor() {
          const $schemaEditor = $('<div>').addClass('schemaEditors').appendTo($el);

          if ($scope.agg.schema.editor) {
            $schemaEditor.append($scope.agg.schema.editor);
            $compile($schemaEditor)($scope.$new());
          }
        }

        function addAggSelector() {
          const $aggSelect = $(aggSelectHtml).appendTo($el);
          $compile($aggSelect)($scope);
        }

        // params for the selected agg, these are rebuilt every time the agg in $aggSelect changes
        let $aggParamEditors; //  container for agg type param editors
        let $aggParamEditorsScope;

        function updateAggParamEditor() {
          $scope.aggHelpLink = null;
          if (_.has($scope, 'agg.type.name')) {
            $scope.aggHelpLink = _.get(documentationLinks, ['aggs', $scope.agg.type.name]);
          }

          if ($aggParamEditors) {
            $aggParamEditors.remove();
            $aggParamEditors = null;
          }

          // if there's an old scope, destroy it
          if ($aggParamEditorsScope) {
            $aggParamEditorsScope.$destroy();
            $aggParamEditorsScope = null;
          }

          if (!$scope.agg || !$scope.agg.type) {
            return;
          }

          // create child scope, used in the editors
          $aggParamEditorsScope = $scope.$new();
          $aggParamEditorsScope.indexedFields = $scope.agg.getFieldOptions();
          const aggParamHTML = {
            basic: [],
            advanced: []
          };

          // build collection of agg params html
          $scope.agg.type.params.forEach(function (param, i) {
            let aggParam;
            let fields;
            if ($scope.agg.schema.hideCustomLabel && param.name === 'customLabel') {
              return;
            }
            // if field param exists, compute allowed fields
            if (param.name === 'field') {
              fields = $aggParamEditorsScope.indexedFields;
            } else if (param.type === 'field') {
              fields = $aggParamEditorsScope[`${param.name}Options`] = param.getFieldOptions($scope.agg);
            }

            if (fields) {
              const hasIndexedFields = fields.length > 0;
              const isExtraParam = i > 0;
              if (!hasIndexedFields && isExtraParam) { // don't draw the rest of the options if there are no indexed fields.
                return;
              }
            }


            let type = 'basic';
            if (param.advanced) type = 'advanced';

            if (aggParam = getAggParamHTML(param, i)) {
              aggParamHTML[type].push(aggParam);
            }

          });

          // compile the paramEditors html elements
          let paramEditors = aggParamHTML.basic;

          if (aggParamHTML.advanced.length) {
            paramEditors.push($(advancedToggleHtml).get(0));
            paramEditors = paramEditors.concat(aggParamHTML.advanced);
          }

          $aggParamEditors = $(paramEditors).appendTo($el);
          $compile($aggParamEditors)($aggParamEditorsScope);
        }

        // build HTML editor given an aggParam and index
        function getAggParamHTML(param, idx) {
        // don't show params without an editor
          if (!param.editor) {
            return;
          }

          const attrs = {
            'agg-param': 'agg.type.params[' + idx + ']'
          };

          if (param.advanced) {
            attrs['ng-show'] = 'advancedToggled';
          }

          return $('<vis-agg-param-editor>')
            .attr(attrs)
            .append(param.editor)
            .get(0);
        }
      }
    };
  });
